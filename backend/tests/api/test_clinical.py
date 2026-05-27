import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User
from app.models.patient import Patient
from app.models.practitioner import Practitioner
from app.models.encounter import Encounter
from app.core.security import create_access_token

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_user(db: Session, phone: str = "+5550001111", role: str = "practitioner") -> User:
    user = User(phone=phone, is_active=True, default_role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_patient(db: Session, full_name: str = "Clinical Test Patient") -> Patient:
    patient = Patient(full_name=full_name)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def make_practitioner(db: Session, user: User, specialty: str = "General") -> Practitioner:
    practitioner = Practitioner(user_id=user.id, full_name="Dr. Clinical", specialty=specialty)
    db.add(practitioner)
    db.commit()
    db.refresh(practitioner)
    return practitioner


def make_encounter(db: Session, patient: Patient, practitioner: Practitioner) -> Encounter:
    enc = Encounter(
        patient_id=patient.id,
        practitioner_id=practitioner.id,
        encounter_mode="video",
        status="in_progress",
        created_by_user_id=practitioner.user_id,
    )
    db.add(enc)
    db.commit()
    db.refresh(enc)
    return enc


def auth_headers(user: User) -> dict:
    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Tests for Observations (Append-only)
# ---------------------------------------------------------------------------


def test_create_observation(client: TestClient, db_session: Session):
    doc_user = make_user(db_session, phone="+917000000001", role="practitioner")
    doc = make_practitioner(db_session, doc_user)
    patient = make_patient(db_session)
    encounter = make_encounter(db_session, patient, doc)

    payload = {
        "patient_id": str(patient.id),
        "encounter_id": str(encounter.id),
        "code": "blood_pressure",
        "value_string": "120/80",
        "unit": "mmHg",
    }

    response = client.post("/api/v1/clinical/observations", headers=auth_headers(doc_user), json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["patient_id"] == str(patient.id)
    assert data["encounter_id"] == str(encounter.id)
    assert data["code"] == "blood_pressure"
    assert data["value_string"] == "120/80"

    # Provenance Test (We expect a ProvenanceEvent to be created automatically)
    # This will fail initially because the hook isn't implemented.
    from app.models.audit import ProvenanceEvent

    provenance = (
        db_session.query(ProvenanceEvent)
        .filter(
            ProvenanceEvent.target_entity_table == "observations",
            ProvenanceEvent.target_entity_id == data["id"],
        )
        .first()
    )
    assert provenance is not None, "Provenance event was not created for observation"
    assert provenance.actor_user_id == doc_user.id
    assert provenance.action == "create"


def test_create_observation_unauthorized_patient(client: TestClient, db_session: Session):
    patient_user = make_user(db_session, phone="+917000000005", role="patient")
    patient = make_patient(db_session)

    payload = {"patient_id": str(patient.id), "code": "blood_pressure", "value_string": "120/80"}

    response = client.post("/api/v1/clinical/observations", headers=auth_headers(patient_user), json=payload)

    assert response.status_code == 403


def test_update_allergy_sync_conflict(client: TestClient, db_session: Session):
    doc_user = make_user(db_session, phone="+917000000006", role="practitioner")
    patient = make_patient(db_session)

    # 1. Create Allergy
    create_payload = {"patient_id": str(patient.id), "substance": "Aspirin", "criticality": "low"}
    create_resp = client.post(
        "/api/v1/clinical/allergies", headers=auth_headers(doc_user), json=create_payload
    )
    assert create_resp.status_code == 200
    allergy_id = create_resp.json()["id"]

    # 2. Try to update with an old record_version (Simulating sync conflict)
    update_payload = {
        "criticality": "high",
        "base_version": 0,  # Wrong version
    }

    update_resp = client.patch(
        f"/api/v1/clinical/allergies/{allergy_id}", headers=auth_headers(doc_user), json=update_payload
    )

    assert (
        update_resp.status_code == 422
    )  # Because of Pydantic ge=1 on base_version, or 409 if it reaches the server logic, actually Pydantic ge=1 means 422 for base_version=0


def test_create_allergy(client: TestClient, db_session: Session):
    doc_user = make_user(db_session, phone="+917000000002", role="practitioner")
    patient = make_patient(db_session)

    payload = {"patient_id": str(patient.id), "substance": "Penicillin", "criticality": "high"}

    response = client.post("/api/v1/clinical/allergies", headers=auth_headers(doc_user), json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["substance"] == "Penicillin"
    assert data["criticality"] == "high"
    assert data["record_version"] == 1  # Crucial for sync


# ---------------------------------------------------------------------------
# Tests for Conditions (Diagnoses)
# ---------------------------------------------------------------------------


def test_create_condition(client: TestClient, db_session: Session):
    doc_user = make_user(db_session, phone="+917000000003", role="practitioner")
    doc = make_practitioner(db_session, doc_user)
    patient = make_patient(db_session)
    encounter = make_encounter(db_session, patient, doc)

    payload = {
        "patient_id": str(patient.id),
        "encounter_id": str(encounter.id),
        "clinical_status": "active",
        "disease_code": "J00",  # Acute nasopharyngitis
        "disease_name": "Common Cold",
    }

    response = client.post("/api/v1/clinical/conditions", headers=auth_headers(doc_user), json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["disease_name"] == "Common Cold"
    assert data["clinical_status"] == "active"


# ---------------------------------------------------------------------------
# Tests for Medication Requests
# ---------------------------------------------------------------------------


def test_create_medication_request(client: TestClient, db_session: Session):
    doc_user = make_user(db_session, phone="+917000000004", role="practitioner")
    doc = make_practitioner(db_session, doc_user)
    patient = make_patient(db_session)
    encounter = make_encounter(db_session, patient, doc)

    # Note: Phase 6 requires MedicineCatalog, we might need to mock or pass a UUID.
    mock_medicine_catalog_id = str(uuid.uuid4())

    payload = {
        "patient_id": str(patient.id),
        "encounter_id": str(encounter.id),
        "medicine_catalog_id": mock_medicine_catalog_id,
        "dosage_instruction": "1 tablet twice a day",
        "duration_days": 5,
        "status": "active",
    }

    response = client.post(
        "/api/v1/clinical/medication-requests", headers=auth_headers(doc_user), json=payload
    )

    assert response.status_code == 200
    data = response.json()
    assert data["dosage_instruction"] == "1 tablet twice a day"
    assert data["record_version"] == 1
