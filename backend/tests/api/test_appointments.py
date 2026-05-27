import uuid
from datetime import datetime, timedelta, timezone
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
    practitioner = Practitioner(
        user_id=user.id, full_name="Dr. Test Practitioner", specialty=specialty, specialty_category=specialty
    )
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


def test_create_appointment_success(client: TestClient, db_session: Session):
    patient_user = make_user(db_session, phone="+919000000001", role="patient")
    patient = make_patient(db_session, full_name="Regular Patient")
    doc_user = make_user(db_session, phone="+919000000002", role="doctor")
    doctor = make_practitioner(db_session, doc_user)

    future_date = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

    payload = {
        "patient_id": str(patient.id),
        "practitioner_id": str(doctor.id),
        "channel": "telemedicine",
        "scheduled_for": future_date,
    }

    response = client.post(
        "/api/v1/appointments/", headers=auth_headers(patient_user), json=payload
    )

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["patient_id"] == str(patient.id)
    assert data["practitioner_id"] == str(doctor.id)
    assert data["status"] == "requested"
    assert data["channel"] == "telemedicine"
    assert data["created_by_user_id"] == str(patient_user.id)


def test_create_appointment_with_symptoms(client: TestClient, db_session: Session):
    patient_user = make_user(db_session, phone="+919000000091", role="patient")
    patient = make_patient(db_session, full_name="Symptom Patient")
    doc_user = make_user(db_session, phone="+919000000092", role="doctor")
    # Make a cardiologist so the triage engine can route to them
    make_practitioner(db_session, doc_user, specialty="Cardiology")

    payload = {
        "patient_id": str(patient.id),
        "channel": "telemedicine",
        "symptom_intake": {
            "raw_text": "Severe chest pain and palpitations",
            "symptoms": ["chest pain", "palpitations"],
            "severity": "Severe",
            "duration": "2 hours"
        }
    }

    response = client.post(
        "/api/v1/appointments/", headers=auth_headers(patient_user), json=payload
    )

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    # The triage engine should have auto-assigned a cardiologist
    # (It might be the one we created or another one in the test DB)
    assigned_doc = db_session.query(Practitioner).get(data["practitioner_id"])
    assert assigned_doc.specialty_category == "Cardiology"
    assert data["status"] == "requested"


def test_create_appointment_assisted_flow(client: TestClient, db_session: Session):
    """An ASHA worker books an appointment for a patient without a phone."""
    asha_user = make_user(db_session, phone="+919000000003", role="asha_worker")
    child_patient = make_patient(db_session, full_name="Child No Phone")

    payload = {"patient_id": str(child_patient.id), "channel": "assisted"}

    response = client.post("/api/v1/appointments/", headers=auth_headers(asha_user), json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == str(child_patient.id)
    assert data["practitioner_id"] is None
    assert data["status"] == "requested"
    assert data["created_by_user_id"] == str(asha_user.id)  # Audit trail captured ASHA worker


def test_create_appointment_invalid_patient(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+919000000004", role="patient")
    invalid_patient_id = str(uuid.uuid4())

    payload = {"patient_id": invalid_patient_id, "channel": "telemedicine"}

    response = client.post("/api/v1/appointments/", headers=auth_headers(user), json=payload)

    assert response.status_code == 404  # Patient not found


def test_get_appointments_list(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+919000000005", role="patient")
    patient = make_patient(db_session, full_name="List Patient")

    # Create two appointments
    for _ in range(2):
        client.post(
            "/api/v1/appointments/",
            headers=auth_headers(user),
            json={"patient_id": str(patient.id), "channel": "telemedicine"},
        )

    response = client.get(
        f"/api/v1/appointments/?patient_id={patient.id}", headers=auth_headers(user)
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    assert any(item["patient_id"] == str(patient.id) for item in data)


def test_update_appointment_status(client: TestClient, db_session: Session):
    # Setup
    doc_user = make_user(db_session, phone="+919000000006", role="practitioner")
    doc = make_practitioner(db_session, doc_user)
    patient_user = make_user(db_session, phone="+919000000007", role="patient")
    patient = make_patient(db_session, full_name="Status Patient")

    # Create Appt
    create_resp = client.post(
        "/api/v1/appointments/",
        headers=auth_headers(patient_user),
        json={
            "patient_id": str(patient.id),
            "practitioner_id": str(doc.id),
            "channel": "telemedicine",
        },
    )
    assert create_resp.status_code == 200
    appt_id = create_resp.json()["id"]

    # Update Status to confirmed (Doctor action)
    patch_resp = client.patch(
        f"/api/v1/appointments/{appt_id}",
        headers=auth_headers(doc_user),
        json={"status": "confirmed"},
    )

    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "confirmed"


def test_update_appointment_invalid_status(client: TestClient, db_session: Session):
    # Setup
    user = make_user(db_session, phone="+919000000008", role="patient")
    patient = make_patient(db_session)

    # Create Appt
    create_resp = client.post(
        "/api/v1/appointments/",
        headers=auth_headers(user),
        json={"patient_id": str(patient.id), "channel": "telemedicine"},
    )
    assert create_resp.status_code == 200
    appt_id = create_resp.json()["id"]

    # Invalid transition or status
    patch_resp = client.patch(
        f"/api/v1/appointments/{appt_id}",
        headers=auth_headers(user),
        json={"status": "super_mega_confirmed"},
    )

    assert patch_resp.status_code == 422  # Pydantic validation failure expected for enums


def test_get_appointment_with_multiple_family_profiles(client: TestClient, db_session: Session):
    # Setup user
    user = make_user(db_session, phone="+919000000009", role="patient")
    
    # Setup two patients for the same user
    patient1 = make_patient(db_session, full_name="Family Member 1")
    patient1.created_by_user_id = user.id
    patient2 = make_patient(db_session, full_name="Family Member 2")
    patient2.created_by_user_id = user.id
    db_session.commit()

    # Create Appt for the SECOND patient
    create_resp = client.post(
        "/api/v1/appointments/",
        headers=auth_headers(user),
        json={"patient_id": str(patient2.id), "channel": "telemedicine"},
    )
    assert create_resp.status_code == 200
    appt_id = create_resp.json()["id"]

    # Try to GET the appointment details
    get_resp = client.get(
        f"/api/v1/appointments/{appt_id}",
        headers=auth_headers(user),
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["patient_name"] == "Family Member 2"
