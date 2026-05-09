import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User
from app.models.patient import Patient
from app.models.practitioner import Practitioner
from app.core.security import create_access_token

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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

def make_practitioner(db: Session, user: User, specialty: str = "General") -> Practitioner:
    practitioner = Practitioner(user_id=user.id, full_name="Dr. Test Practitioner", specialty=specialty)
    db.add(practitioner)
    db.commit()
    db.refresh(practitioner)
    return practitioner

def auth_headers(user: User) -> dict:
    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_create_encounter_from_appointment(client: TestClient, db_session: Session):
    doc_user = make_user(db_session, phone="+918000000001", role="practitioner")
    doc = make_practitioner(db_session, doc_user)
    patient_user = make_user(db_session, phone="+918000000002", role="patient")
    patient = make_patient(db_session, full_name="Encounter Patient")
    
    # 1. Mock an existing appointment
    appt_payload = {
        "patient_id": str(patient.id),
        "practitioner_id": str(doc.id),
        "channel": "telemedicine"
    }
    appt_resp = client.post(
        "/api/v1/appointments/",
        headers=auth_headers(patient_user),
        json=appt_payload
    )
    assert appt_resp.status_code == 200, "Appointment creation failed"
    appt_id = appt_resp.json()["id"]
    
    # 2. Create the encounter
    enc_payload = {
        "appointment_id": appt_id,
        "patient_id": str(patient.id),
        "practitioner_id": str(doc.id),
        "encounter_mode": "video"
    }
    enc_resp = client.post(
        "/api/v1/encounters/",
        headers=auth_headers(doc_user),
        json=enc_payload
    )
    
    assert enc_resp.status_code == 200
    data = enc_resp.json()
    assert data["appointment_id"] == appt_id
    assert data["patient_id"] == str(patient.id)
    assert data["practitioner_id"] == str(doc.id)
    assert data["encounter_mode"] == "video"
    assert data["status"] == "in_progress"
    assert data["record_version"] == 1


def test_create_encounter_walk_in(client: TestClient, db_session: Session):
    """Creating an encounter without a scheduled appointment (e.g. emergency)."""
    doc_user = make_user(db_session, phone="+918000000003", role="practitioner")
    doc = make_practitioner(db_session, doc_user)
    patient = make_patient(db_session, full_name="Walk-in Patient")
    
    enc_payload = {
        "patient_id": str(patient.id),
        "practitioner_id": str(doc.id),
        "encounter_mode": "async"
    }
    enc_resp = client.post(
        "/api/v1/encounters/",
        headers=auth_headers(doc_user),
        json=enc_payload
    )
    
    assert enc_resp.status_code == 200
    data = enc_resp.json()
    assert data["appointment_id"] is None
    assert data["patient_id"] == str(patient.id)
    assert data["encounter_mode"] == "async"


def test_create_encounter_invalid_modality(client: TestClient, db_session: Session):
    doc_user = make_user(db_session, phone="+918000000004", role="practitioner")
    doc = make_practitioner(db_session, doc_user)
    patient = make_patient(db_session)
    
    enc_payload = {
        "patient_id": str(patient.id),
        "practitioner_id": str(doc.id),
        "encounter_mode": "hologram" # Invalid mode
    }
    enc_resp = client.post(
        "/api/v1/encounters/",
        headers=auth_headers(doc_user),
        json=enc_payload
    )
    
    assert enc_resp.status_code == 422 # Should fail Pydantic validation


def test_submit_encounter_summary_success(client: TestClient, db_session: Session):
    doc_user = make_user(db_session, phone="+918000000005", role="practitioner")
    doc = make_practitioner(db_session, doc_user)
    patient = make_patient(db_session)
    
    # 1. Create Encounter
    enc_resp = client.post(
        "/api/v1/encounters/",
        headers=auth_headers(doc_user),
        json={"patient_id": str(patient.id), "practitioner_id": str(doc.id), "encounter_mode": "audio"}
    )
    assert enc_resp.status_code == 200
    enc_id = enc_resp.json()["id"]
    
    # 2. Submit Summary
    summary_payload = {
        "clinical_summary": "Patient reports mild fever. Prescribed paracetamol.",
        "outcome": "completed"
    }
    sum_resp = client.post(
        f"/api/v1/encounters/{enc_id}/summary",
        headers=auth_headers(doc_user),
        json=summary_payload
    )
    
    assert sum_resp.status_code == 200
    data = sum_resp.json()
    assert data["clinical_summary"] == summary_payload["clinical_summary"]
    assert data["status"] == "completed"
    assert data["record_version"] == 2 # Sync logic: version should increment


def test_submit_encounter_summary_unauthorized(client: TestClient, db_session: Session):
    """A patient should not be able to write the clinical summary of their own encounter."""
    doc_user = make_user(db_session, phone="+918000000006", role="practitioner")
    doc = make_practitioner(db_session, doc_user)
    patient_user = make_user(db_session, phone="+918000000007", role="patient")
    patient = make_patient(db_session)
    
    # 1. Create Encounter (by doctor)
    enc_resp = client.post(
        "/api/v1/encounters/",
        headers=auth_headers(doc_user),
        json={"patient_id": str(patient.id), "practitioner_id": str(doc.id), "encounter_mode": "video"}
    )
    assert enc_resp.status_code == 200
    enc_id = enc_resp.json()["id"]
    
    # 2. Submit Summary (by patient) -> Should Fail
    sum_resp = client.post(
        f"/api/v1/encounters/{enc_id}/summary",
        headers=auth_headers(patient_user),
        json={"clinical_summary": "I am fine now."}
    )
    
    assert sum_resp.status_code == 403 # Forbidden
