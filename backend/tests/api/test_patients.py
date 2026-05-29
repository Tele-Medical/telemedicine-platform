"""Integration tests for app/api/v1/patients.py (added in this PR)."""

import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User
from app.models.patient import Patient, PatientIdentifier
from app.core.security import create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_user(db: Session, phone: str = "+5550001111", role: str = "doctor") -> User:
    user = User(phone=phone, is_active=True, default_role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_patient(db: Session, full_name: str = "Test Patient") -> Patient:
    patient = Patient(full_name=full_name)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def auth_headers(user: User) -> dict:
    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Patient CRUD
# ---------------------------------------------------------------------------


def test_create_patient_success(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550003331")
    payload = {
        "full_name": "John Doe",
        "phone": "+919876543210",
        "preferred_language": "pa",
        "gender": "male",
        "village": "Nabha",
    }
    response = client.post("/api/v1/patients/", headers=auth_headers(user), json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "John Doe"
    assert data["phone"] == "+919876543210"
    assert data["created_by_user_id"] == str(user.id)
    assert "id" in data


def test_get_my_family(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550003332_family", role="patient")
    # Link some patients
    p1 = make_patient(db_session, "Family Member 1")
    p1.user_id = user.id
    p2 = make_patient(db_session, "Family Member 2")
    p2.user_id = user.id
    db_session.commit()

    response = client.get("/api/v1/patients/me/family", headers=auth_headers(user))
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {p["full_name"] for p in data}
    assert "Family Member 1" in names
    assert "Family Member 2" in names


def test_create_patient_assisted_no_phone(client: TestClient, db_session: Session):
    """Test creating a patient without a phone number (assisted registration)."""
    user = make_user(db_session, phone="+5550003332")
    payload = {
        "full_name": "Child Patient",
        "phone": None,
        "emergency_contact_name": "Guardian Name",
        "emergency_contact_phone": "+919999988888",
    }
    response = client.post("/api/v1/patients/", headers=auth_headers(user), json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Child Patient"
    assert data["phone"] is None
    assert data["emergency_contact_phone"] == "+919999988888"


def test_get_patient_success(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550003333")
    patient = make_patient(db_session, "Fetchable Patient")

    response = client.get(f"/api/v1/patients/{patient.id}", headers=auth_headers(user))
    assert response.status_code == 200
    assert response.json()["full_name"] == "Fetchable Patient"


def test_get_patient_not_found(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550003334")
    random_id = uuid.uuid4()
    response = client.get(f"/api/v1/patients/{random_id}", headers=auth_headers(user))
    assert response.status_code == 404


def test_search_patients_success(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550003335")
    make_patient(db_session, "Amrit Singh")
    make_patient(db_session, "Amrit Kaur")
    make_patient(db_session, "Deepak Kumar")

    response = client.get("/api/v1/patients/?q=Amrit", headers=auth_headers(user))
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {p["full_name"] for p in data}
    assert "Amrit Singh" in names
    assert "Amrit Kaur" in names


def test_update_patient_success(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550003336")
    patient = make_patient(db_session, "Original Name")

    payload = {"full_name": "Updated Name", "village": "Patiala"}
    response = client.patch(
        f"/api/v1/patients/{patient.id}", headers=auth_headers(user), json=payload
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["village"] == "Patiala"
    assert data["updated_by_user_id"] == str(user.id)
    assert data["record_version"] == 2


# ---------------------------------------------------------------------------
# GET /api/v1/patients/{id}/identifiers
# ---------------------------------------------------------------------------


def test_get_patient_identifiers_unauthenticated(client: TestClient, db_session: Session):
    patient = make_patient(db_session)
    response = client.get(f"/api/v1/patients/{patient.id}/identifiers")
    assert response.status_code == 401


def test_get_patient_identifiers_empty(client: TestClient, db_session: Session):
    user = make_user(db_session)
    patient = make_patient(db_session)

    response = client.get(
        f"/api/v1/patients/{patient.id}/identifiers",
        headers=auth_headers(user),
    )
    assert response.status_code == 200
    assert response.json() == []


def test_get_patient_identifiers_with_data(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550001112")
    patient = make_patient(db_session, "Patient With IDs")

    id1 = PatientIdentifier(
        patient_id=patient.id, identifier_type="abha", identifier_value="ABHA-GET-1"
    )
    id2 = PatientIdentifier(
        patient_id=patient.id, identifier_type="local_clinic_id", identifier_value="LC-GET-2"
    )
    db_session.add_all([id1, id2])
    db_session.commit()

    response = client.get(
        f"/api/v1/patients/{patient.id}/identifiers",
        headers=auth_headers(user),
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    types = {item["identifier_type"] for item in data}
    assert types == {"abha", "local_clinic_id"}


def test_get_patient_identifiers_response_shape(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550001113")
    patient = make_patient(db_session, "Patient Shape Test")
    identifier = PatientIdentifier(
        patient_id=patient.id, identifier_type="abha", identifier_value="SHAPE-VAL"
    )
    db_session.add(identifier)
    db_session.commit()

    response = client.get(
        f"/api/v1/patients/{patient.id}/identifiers",
        headers=auth_headers(user),
    )
    assert response.status_code == 200
    item = response.json()[0]
    assert "id" in item
    assert "identifier_type" in item
    assert "identifier_value" in item
    assert "created_at" in item


def test_get_patient_identifiers_invalid_uuid(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550001114")
    response = client.get(
        "/api/v1/patients/not-a-uuid/identifiers",
        headers=auth_headers(user),
    )
    assert response.status_code == 422


def test_get_patient_identifiers_unknown_patient_returns_empty(
    client: TestClient, db_session: Session
):
    """get_identifiers does not validate patient existence; returns empty list."""
    user = make_user(db_session, phone="+5550001115")
    random_id = uuid.uuid4()
    response = client.get(
        f"/api/v1/patients/{random_id}/identifiers",
        headers=auth_headers(user),
    )
    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# POST /api/v1/patients/{id}/identifiers
# ---------------------------------------------------------------------------


def test_create_patient_identifier_unauthenticated(client: TestClient, db_session: Session):
    patient = make_patient(db_session)
    response = client.post(
        f"/api/v1/patients/{patient.id}/identifiers",
        json={"identifier_type": "abha", "identifier_value": "ABHA-UNAUTH"},
    )
    assert response.status_code == 401


def test_create_patient_identifier_success(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550002221")
    patient = make_patient(db_session, "Create ID Patient")

    response = client.post(
        f"/api/v1/patients/{patient.id}/identifiers",
        headers=auth_headers(user),
        json={"identifier_type": "abha", "identifier_value": "ABHA-NEW"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["identifier_type"] == "abha"
    assert data["identifier_value"] == "ABHA-NEW"
    assert "id" in data


def test_create_patient_identifier_persists(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550002222")
    patient = make_patient(db_session, "Persist Patient")

    client.post(
        f"/api/v1/patients/{patient.id}/identifiers",
        headers=auth_headers(user),
        json={"identifier_type": "local_clinic_id", "identifier_value": "LC-PERSIST"},
    )

    stored = (
        db_session.query(PatientIdentifier)
        .filter_by(patient_id=patient.id, identifier_value="LC-PERSIST")
        .first()
    )
    assert stored is not None


def test_create_patient_identifier_patient_not_found(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550002223")
    random_id = uuid.uuid4()
    response = client.post(
        f"/api/v1/patients/{random_id}/identifiers",
        headers=auth_headers(user),
        json={"identifier_type": "abha", "identifier_value": "ABHA-MISS"},
    )
    assert response.status_code == 404


def test_create_patient_identifier_duplicate_same_patient_idempotent(
    client: TestClient, db_session: Session
):
    user = make_user(db_session, phone="+5550002224")
    patient = make_patient(db_session, "Idempotent Patient")

    payload = {"identifier_type": "abha", "identifier_value": "ABHA-IDEM"}
    r1 = client.post(
        f"/api/v1/patients/{patient.id}/identifiers",
        headers=auth_headers(user),
        json=payload,
    )
    r2 = client.post(
        f"/api/v1/patients/{patient.id}/identifiers",
        headers=auth_headers(user),
        json=payload,
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
    # Both should return the same identifier
    assert r1.json()["id"] == r2.json()["id"]


def test_create_patient_identifier_duplicate_different_patient_rejected(
    client: TestClient, db_session: Session
):
    user = make_user(db_session, phone="+5550002225")
    patient_a = make_patient(db_session, "Conflict Patient A")
    patient_b = make_patient(db_session, "Conflict Patient B")

    payload = {"identifier_type": "abha", "identifier_value": "ABHA-CONFLICT-API"}
    client.post(
        f"/api/v1/patients/{patient_a.id}/identifiers",
        headers=auth_headers(user),
        json=payload,
    )
    response = client.post(
        f"/api/v1/patients/{patient_b.id}/identifiers",
        headers=auth_headers(user),
        json=payload,
    )
    assert response.status_code == 400


def test_create_patient_identifier_missing_fields(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550002226")
    patient = make_patient(db_session)
    # Missing identifier_value
    response = client.post(
        f"/api/v1/patients/{patient.id}/identifiers",
        headers=auth_headers(user),
        json={"identifier_type": "abha"},
    )
    assert response.status_code == 422


def test_create_patient_identifier_invalid_patient_uuid(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550002227")
    response = client.post(
        "/api/v1/patients/not-a-uuid/identifiers",
        headers=auth_headers(user),
        json={"identifier_type": "abha", "identifier_value": "X"},
    )
    assert response.status_code == 422


def test_create_patient_identifier_inactive_user_rejected(client: TestClient, db_session: Session):
    inactive_user = User(phone="+5550002228", is_active=False)
    db_session.add(inactive_user)
    db_session.commit()
    db_session.refresh(inactive_user)

    patient = make_patient(db_session)
    response = client.post(
        f"/api/v1/patients/{patient.id}/identifiers",
        headers=auth_headers(inactive_user),
        json={"identifier_type": "abha", "identifier_value": "ABHA-INACTIVE"},
    )
    assert response.status_code == 401
