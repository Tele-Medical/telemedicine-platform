import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.auth import User
from app.models.clinical import Allergy
from app.models.sync import SyncConflict
from app.core.security import create_access_token

def get_auth_headers(db_session: Session):
    user = User(
        username=f"testuser_{uuid.uuid4().hex[:6]}",
        phone=f"+{uuid.uuid4().int % 10**10}",
        is_active=True,
        default_role="doctor"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}, user

def test_sync_push_idempotency(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    operation_id = uuid.uuid4()
    allergy_id = uuid.uuid4()
    patient_id = uuid.uuid4()
    
    # Create patient first
    from app.models.patient import Patient
    patient = Patient(id=patient_id, full_name="Sync Patient", record_version=1)
    db_session.add(patient)
    db_session.commit()
    
    sync_payload = {
        "operations": [
            {
                "operation_id": str(operation_id),
                "entity_type": "allergy",
                "entity_id": str(allergy_id),
                "action": "create",
                "base_version": 0,
                "payload": {
                    "substance": "Peanuts",
                    "criticality": "high",
                    "patient_id": str(patient_id)
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    
    # First push
    response1 = client.post("/api/v1/sync/push", json=sync_payload, headers=headers)
    assert response1.status_code == 200
    assert response1.json()["success_count"] == 1
    
    # Second push with same operation_id
    response2 = client.post("/api/v1/sync/push", json=sync_payload, headers=headers)
    assert response2.status_code == 200
    assert response2.json()["success_count"] == 0
    assert response2.json()["duplicate_count"] == 1

def test_sync_push_conflict_detection(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    allergy_id = uuid.uuid4()
    patient_id = uuid.uuid4()
    
    # Create patient first
    from app.models.patient import Patient
    patient = Patient(id=patient_id, full_name="Conflict Patient", record_version=1)
    db_session.add(patient)
    db_session.commit()
    
    # 1. Create initial record on server
    allergy = Allergy(
        id=allergy_id,
        patient_id=patient_id,
        substance="Dust",
        criticality="low",
        record_version=1,
        created_by_user_id=user.id
    )
    db_session.add(allergy)
    db_session.commit()
    
    # 2. Client tries to update with base_version=1 (correct)
    sync_payload_ok = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "entity_type": "allergy",
                "entity_id": str(allergy_id),
                "action": "update",
                "base_version": 1,
                "payload": {"criticality": "high"},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    response1 = client.post("/api/v1/sync/push", json=sync_payload_ok, headers=headers)
    assert response1.status_code == 200
    assert response1.json()["success_count"] == 1
    
    # 3. Another operation tries to update with base_version=1 (now stale, server is version 2)
    sync_payload_conflict = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "entity_type": "allergy",
                "entity_id": str(allergy_id),
                "action": "update",
                "base_version": 1,
                "payload": {"substance": "Severe Dust"},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    response2 = client.post("/api/v1/sync/push", json=sync_payload_conflict, headers=headers)
    assert response2.status_code == 200
    assert response2.json()["success_count"] == 0
    assert response2.json()["conflict_count"] == 1
    
    # Verify a conflict was recorded in DB
    # (Assuming SyncConflict model exists soon)
    # from app.models.sync import SyncConflict
    # assert db_session.query(SyncConflict).count() == 1

def test_sync_pull_incremental(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    patient_id = uuid.uuid4()
    
    # Create patient first
    from app.models.patient import Patient
    patient = Patient(id=patient_id, full_name="Pull Patient", record_version=1)
    db_session.add(patient)
    db_session.commit()
    
    # Create some records
    for i in range(5):
        a = Allergy(
            patient_id=patient_id,
            substance=f"Allergen {i}",
            criticality="low",
            record_version=1,
            created_by_user_id=user.id
        )
        db_session.add(a)
    db_session.commit()
    
    # Pull with no cursor
    response1 = client.get("/api/v1/sync/pull", headers=headers)
    assert response1.status_code == 200
    data1 = response1.json()
    assert len(data1["changes"]) >= 5
    cursor = data1["new_cursor"]
    
    # Add another record
    a_new = Allergy(
        patient_id=patient_id,
        substance="New Allergen",
        criticality="low",
        record_version=1,
        created_by_user_id=user.id
    )
    db_session.add(a_new)
    db_session.commit()
    
    # Pull with cursor
    response2 = client.get(f"/api/v1/sync/pull?cursor={cursor}", headers=headers)
    assert response2.status_code == 200
    data2 = response2.json()
    assert len(data2["changes"]) == 1
    assert data2["changes"][0]["payload"]["substance"] == "New Allergen"

def test_sync_conflict_resolution_client_wins(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    patient_id = uuid.uuid4()
    allergy_id = uuid.uuid4()
    
    # 1. Setup Patient and Allergy
    from app.models.patient import Patient
    patient = Patient(id=patient_id, full_name="Conflict Patient", record_version=1)
    db_session.add(patient)
    db_session.flush()
    allergy = Allergy(id=allergy_id, patient_id=patient_id, substance="Peanuts", criticality="low", record_version=1, created_by_user_id=user.id)
    db_session.add(allergy)
    db_session.commit()
    
    # 2. Trigger a conflict via push
    sync_payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "entity_type": "allergy",
                "entity_id": str(allergy_id),
                "action": "update",
                "base_version": 0, # Stale version (should be 1)
                "payload": {"criticality": "high"},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    client.post("/api/v1/sync/push", json=sync_payload, headers=headers)
    
    conflict = db_session.query(SyncConflict).filter_by(entity_id=allergy_id).first()
    assert conflict is not None
    
    # 3. Resolve with client_wins
    response = client.post(
        f"/api/v1/sync/conflicts/{conflict.id}/resolve",
        json={"strategy": "client_wins"},
        headers=headers
    )
    assert response.status_code == 200
    
    # 4. Verify persistence
    db_session.refresh(allergy)
    assert allergy.criticality == "high"
    assert allergy.record_version == 2

def test_sync_conflict_manual_merge_validation(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    conflict_id = uuid.uuid4()
    
    # Test that manual_merge requires merged_payload
    response = client.post(
        f"/api/v1/sync/conflicts/{conflict_id}/resolve",
        json={"strategy": "manual_merge"},
        headers=headers
    )
    assert response.status_code == 422 # Pydantic validation error
    assert "merged_payload is required" in response.text

def test_sync_push_delete(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    allergy_id = uuid.uuid4()
    patient_id = uuid.uuid4()
    
    # Create patient and allergy
    from app.models.patient import Patient
    patient = Patient(id=patient_id, full_name="Delete Patient", record_version=1)
    db_session.add(patient)
    db_session.commit()
    
    allergy = Allergy(id=allergy_id, patient_id=patient_id, substance="Gluten", criticality="low", record_version=1, created_by_user_id=user.id)
    db_session.add(allergy)
    db_session.commit()
    
    # Push delete operation
    sync_payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "entity_type": "allergy",
                "entity_id": str(allergy_id),
                "action": "delete",
                "base_version": 1,
                "payload": {},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    response = client.post("/api/v1/sync/push", json=sync_payload, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["success_count"] == 1, response.json()
    
    # Verify soft delete
    db_session.refresh(allergy)
    assert allergy.is_active is False
    assert allergy.record_version == 2

def test_sync_push_mixed_batch(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    patient_id = uuid.uuid4()
    allergy_id = uuid.uuid4()
    condition_id = uuid.uuid4()
    
    # Setup: Create patient and one condition to update
    from app.models.patient import Patient
    from app.models.clinical import Condition
    patient = Patient(id=patient_id, full_name="Batch Patient", record_version=1)
    db_session.add(patient)
    db_session.flush()
    condition = Condition(id=condition_id, patient_id=patient_id, clinical_status="active", disease_name="Flu", record_version=1, created_by_user_id=user.id)
    db_session.add(condition)
    db_session.commit()
    
    sync_payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "entity_type": "allergy",
                "entity_id": str(allergy_id),
                "action": "create",
                "payload": {"substance": "Milk", "criticality": "low", "patient_id": str(patient_id)},
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "operation_id": str(uuid.uuid4()),
                "entity_type": "condition",
                "entity_id": str(condition_id),
                "action": "update",
                "base_version": 1,
                "payload": {"clinical_status": "resolved"},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    
    response = client.post("/api/v1/sync/push", json=sync_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["success_count"] == 2
    
    # Verify DB
    db_session.refresh(condition)
    assert condition.clinical_status == "resolved"
    assert db_session.query(Allergy).filter_by(id=allergy_id).first() is not None

def test_sync_push_errors(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    
    sync_payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "entity_type": "unknown_type",
                "entity_id": str(uuid.uuid4()),
                "action": "create",
                "payload": {},
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "operation_id": str(uuid.uuid4()),
                "entity_type": "allergy",
                "entity_id": str(uuid.uuid4()), # Non-existent
                "action": "update",
                "base_version": 1,
                "payload": {"substance": "X"},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    
    response = client.post("/api/v1/sync/push", json=sync_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["error_count"] == 2
    assert "Unknown entity type" in response.json()["errors"][0]["error"]
    assert "Entity not found" in response.json()["errors"][1]["error"]

def test_sync_conflict_resolution_strategies(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    patient_id = uuid.uuid4()
    allergy_id = uuid.uuid4()
    
    # 1. Trigger a conflict
    from app.models.patient import Patient
    from app.models.sync import SyncConflict
    patient = Patient(id=patient_id, full_name="Conflict Resolv Patient", record_version=1)
    db_session.add(patient)
    db_session.flush()
    allergy = Allergy(id=allergy_id, patient_id=patient_id, substance="Pollen", criticality="low", record_version=2, created_by_user_id=user.id)
    db_session.add(allergy)
    db_session.commit()
    
    sync_payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "entity_type": "allergy",
                "entity_id": str(allergy_id),
                "action": "update",
                "base_version": 1, # Stale version
                "payload": {"criticality": "high"},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    client.post("/api/v1/sync/push", json=sync_payload, headers=headers)
    
    conflict = db_session.query(SyncConflict).filter_by(entity_id=allergy_id).first()
    assert conflict is not None
    
    # 2. Resolve with SERVER_WINS
    response_sw = client.post(f"/api/v1/sync/conflicts/{conflict.id}/resolve", json={"strategy": "server_wins"}, headers=headers)
    assert response_sw.status_code == 200
    db_session.refresh(allergy)
    assert allergy.criticality == "low" # Unchanged
    
    # 3. Resolve with MANUAL_MERGE
    # Reset conflict for test purposes or create new one
    conflict.resolved_at = None 
    db_session.commit()
    
    response_mm = client.post(
        f"/api/v1/sync/conflicts/{conflict.id}/resolve", 
        json={"strategy": "manual_merge", "merged_payload": {"criticality": "high"}}, 
        headers=headers
    )
    assert response_mm.status_code == 200
    db_session.refresh(allergy)
    assert allergy.criticality == "high"
    assert allergy.record_version == 4

def test_sync_pull_with_device_id(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    device_id = uuid.uuid4()
    
    # Ensure device registration exists for FK
    from app.models.auth import DeviceRegistration
    device = DeviceRegistration(id=device_id, user_id=user.id, platform="android")
    db_session.add(device)
    db_session.commit()
    
    response = client.get(f"/api/v1/sync/pull?device_id={device_id}", headers=headers)
    assert response.status_code == 200
    
    from app.models.sync import SyncCursor
    cursor = db_session.query(SyncCursor).filter_by(device_id=device_id).first()
    assert cursor is not None
    assert cursor.user_id == user.id

def test_sync_pull_tombstones(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session)
    patient_id = uuid.uuid4()
    allergy_id = uuid.uuid4()
    
    # Setup: Create patient and an active allergy
    from app.models.patient import Patient
    patient = Patient(id=patient_id, full_name="Tombstone Patient", record_version=1)
    db_session.add(patient)
    db_session.flush()
    allergy = Allergy(id=allergy_id, patient_id=patient_id, substance="Peanuts", criticality="high", is_active=True, record_version=1, created_by_user_id=user.id)
    db_session.add(allergy)
    db_session.commit()
    
    # Get initial cursor
    resp1 = client.get("/api/v1/sync/pull", headers=headers)
    cursor = resp1.json()["new_cursor"]
    
    # Soft delete the allergy
    allergy.is_active = False
    allergy.record_version = 2
    db_session.commit()
    
    # Pull with cursor
    resp2 = client.get(f"/api/v1/sync/pull?cursor={cursor}", headers=headers)
    assert resp2.status_code == 200
    data = resp2.json()
    assert len(data["changes"]) == 1
    assert data["changes"][0]["action"] == "delete"
    assert data["changes"][0]["entity_id"] == str(allergy_id)
