from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User
from app.models.patient import Patient
from app.core.security import create_access_token


def make_user(db: Session, phone: str = "+5550001111", role: str = "patient") -> User:
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


def test_get_clinical_documents_routing(client: TestClient, db_session: Session):
    # Setup user
    user = make_user(db_session, phone="+919000000099", role="patient")
    patient = make_patient(db_session, full_name="Documents Patient")
    patient.created_by_user_id = user.id
    db_session.commit()

    # The router should be mounted at /api/v1/clinical
    # Meaning /documents is at /api/v1/clinical/documents
    get_resp = client.get(
        f"/api/v1/clinical/documents?patient_id={patient.id}",
        headers=auth_headers(user),
    )
    # The endpoint should exist and return 200 OK (with an empty list since no documents exist)
    assert get_resp.status_code == 200
    assert get_resp.json() == []
