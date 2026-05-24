import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User
from app.core.security import create_access_token


def get_auth_headers(db_session: Session, role: str = "doctor"):
    user = User(
        username=f"test_{role}_{uuid.uuid4().hex[:6]}",
        phone=f"+{uuid.uuid4().int % 10**10}",
        is_active=True,
        default_role=role,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}, user


def test_grant_and_revoke_consent(client: TestClient, db_session: Session):
    headers, patient_user = get_auth_headers(db_session, role="patient")

    from app.models.patient import Patient

    patient = Patient(id=patient_user.id, full_name="Consent Patient", record_version=1)
    db_session.add(patient)
    db_session.commit()

    # Grant Consent
    grant_payload = {
        "purpose": "teleconsultation",
        "scope": "all",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
    }

    response = client.post(
        f"/api/v1/patients/{patient.id}/consents", json=grant_payload, headers=headers
    )
    assert response.status_code == 201
    consent_id = response.json()["id"]
    assert response.json()["status"] == "active"

    # Revoke Consent
    revoke_payload = {"status": "revoked"}
    response2 = client.patch(
        f"/api/v1/patients/{patient.id}/consents/{consent_id}", json=revoke_payload, headers=headers
    )
    assert response2.status_code == 200
    assert response2.json()["status"] == "revoked"


def test_get_active_consents(client: TestClient, db_session: Session):
    headers, patient_user = get_auth_headers(db_session, role="patient")

    from app.models.patient import Patient
    from app.models.audit import Consent

    patient = Patient(id=patient_user.id, full_name="List Consent Patient", record_version=1)
    db_session.add(patient)
    db_session.flush()

    c1 = Consent(
        patient_id=patient.id,
        granted_by_user_id=patient_user.id,
        purpose="teleconsultation",
        status="active",
    )
    c2 = Consent(
        patient_id=patient.id,
        granted_by_user_id=patient_user.id,
        purpose="research",
        status="revoked",
    )
    db_session.add_all([c1, c2])
    db_session.commit()

    response = client.get(f"/api/v1/patients/{patient.id}/consents", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    purposes = [c["purpose"] for c in data]
    assert "teleconsultation" in purposes
    assert "research" in purposes


def test_audit_event_logging(client: TestClient, db_session: Session):
    # This test verifies that accessing a patient's record creates an audit log
    headers, doctor = get_auth_headers(db_session, role="doctor")

    from app.models.patient import Patient

    patient = Patient(full_name="Audited Patient", record_version=1)
    db_session.add(patient)
    db_session.commit()

    # Trigger an audit event by reading the patient profile
    response = client.get(f"/api/v1/patients/{patient.id}", headers=headers)
    assert response.status_code == 200

    from app.models.audit import AuditEvent

    audit_logs = (
        db_session.query(AuditEvent)
        .filter_by(
            target_entity_type="patients",
            target_entity_id=patient.id,
            actor_user_id=doctor.id,
            action="read",
        )
        .all()
    )

    assert len(audit_logs) >= 1
