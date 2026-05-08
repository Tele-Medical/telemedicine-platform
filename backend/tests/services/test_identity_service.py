"""Unit / integration tests for app/services/identity_service.py (added in this PR)."""
import uuid
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.patient import Patient, PatientIdentifier
from app.schemas.identity import IdentifierCreate
from app.services.identity_service import link_identifier, get_identifiers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_patient(db: Session, full_name: str = "Test Patient") -> Patient:
    patient = Patient(full_name=full_name)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


# ---------------------------------------------------------------------------
# link_identifier
# ---------------------------------------------------------------------------

def test_link_identifier_patient_not_found_raises_404(db_session: Session):
    missing_id = uuid.uuid4()
    payload = IdentifierCreate(identifier_type="abha", identifier_value="ABHA-001")
    with pytest.raises(HTTPException) as exc_info:
        link_identifier(db_session, missing_id, payload)
    assert exc_info.value.status_code == 404
    assert "Patient not found" in exc_info.value.detail


def test_link_identifier_creates_new_identifier(db_session: Session):
    patient = make_patient(db_session)
    payload = IdentifierCreate(identifier_type="abha", identifier_value="ABHA-123")
    identifier = link_identifier(db_session, patient.id, payload)

    assert identifier.id is not None
    assert identifier.patient_id == patient.id
    assert identifier.identifier_type == "abha"
    assert identifier.identifier_value == "ABHA-123"


def test_link_identifier_persists_to_db(db_session: Session):
    patient = make_patient(db_session)
    payload = IdentifierCreate(identifier_type="local_clinic_id", identifier_value="LC-999")
    link_identifier(db_session, patient.id, payload)

    stored = db_session.query(PatientIdentifier).filter_by(
        patient_id=patient.id, identifier_value="LC-999"
    ).first()
    assert stored is not None


def test_link_identifier_duplicate_same_patient_returns_existing(db_session: Session):
    patient = make_patient(db_session)
    payload = IdentifierCreate(identifier_type="abha", identifier_value="ABHA-DUP")

    first = link_identifier(db_session, patient.id, payload)
    second = link_identifier(db_session, patient.id, payload)

    # Should return the same record, not create a new one
    assert first.id == second.id
    count = db_session.query(PatientIdentifier).filter_by(
        identifier_type="abha", identifier_value="ABHA-DUP"
    ).count()
    assert count == 1


def test_link_identifier_duplicate_different_patient_raises_400(db_session: Session):
    patient_a = make_patient(db_session, "Patient A")
    patient_b = make_patient(db_session, "Patient B")
    payload = IdentifierCreate(identifier_type="abha", identifier_value="ABHA-CONFLICT")

    link_identifier(db_session, patient_a.id, payload)

    with pytest.raises(HTTPException) as exc_info:
        link_identifier(db_session, patient_b.id, payload)
    assert exc_info.value.status_code == 400
    assert "already linked to another patient" in exc_info.value.detail


def test_link_identifier_error_message_includes_type(db_session: Session):
    patient_a = make_patient(db_session, "Patient A2")
    patient_b = make_patient(db_session, "Patient B2")
    payload = IdentifierCreate(identifier_type="national_id", identifier_value="NID-XXXX")

    link_identifier(db_session, patient_a.id, payload)

    with pytest.raises(HTTPException) as exc_info:
        link_identifier(db_session, patient_b.id, payload)
    assert "national_id" in exc_info.value.detail


def test_link_identifier_same_value_different_type_allowed(db_session: Session):
    """Same value but different identifier_type should be allowed."""
    patient = make_patient(db_session)
    payload_a = IdentifierCreate(identifier_type="abha", identifier_value="SHARED-VALUE")
    payload_b = IdentifierCreate(identifier_type="local_clinic_id", identifier_value="SHARED-VALUE")

    id_a = link_identifier(db_session, patient.id, payload_a)
    id_b = link_identifier(db_session, patient.id, payload_b)

    assert id_a.id != id_b.id


# ---------------------------------------------------------------------------
# get_identifiers
# ---------------------------------------------------------------------------

def test_get_identifiers_empty_for_new_patient(db_session: Session):
    patient = make_patient(db_session)
    result = get_identifiers(db_session, patient.id)
    assert result == []


def test_get_identifiers_returns_all(db_session: Session):
    patient = make_patient(db_session)
    link_identifier(db_session, patient.id, IdentifierCreate(identifier_type="abha", identifier_value="A1"))
    link_identifier(db_session, patient.id, IdentifierCreate(identifier_type="local_clinic_id", identifier_value="L1"))

    result = get_identifiers(db_session, patient.id)
    assert len(result) == 2


def test_get_identifiers_only_for_requested_patient(db_session: Session):
    patient_a = make_patient(db_session, "Patient A Iso")
    patient_b = make_patient(db_session, "Patient B Iso")

    link_identifier(db_session, patient_a.id, IdentifierCreate(identifier_type="abha", identifier_value="A-ONLY"))
    link_identifier(db_session, patient_b.id, IdentifierCreate(identifier_type="abha", identifier_value="B-ONLY"))

    result = get_identifiers(db_session, patient_a.id)
    assert len(result) == 1
    assert result[0].identifier_value == "A-ONLY"


def test_get_identifiers_nonexistent_patient_returns_empty(db_session: Session):
    """get_identifiers does not check patient existence; returns empty list."""
    missing_id = uuid.uuid4()
    result = get_identifiers(db_session, missing_id)
    assert result == []


def test_get_identifiers_returns_correct_fields(db_session: Session):
    patient = make_patient(db_session)
    link_identifier(db_session, patient.id, IdentifierCreate(identifier_type="abha", identifier_value="FIELD-CHECK"))

    result = get_identifiers(db_session, patient.id)
    assert len(result) == 1
    identifier = result[0]
    assert identifier.identifier_type == "abha"
    assert identifier.identifier_value == "FIELD-CHECK"
    assert identifier.patient_id == patient.id
    assert identifier.created_at is not None
