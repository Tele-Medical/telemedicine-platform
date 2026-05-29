import uuid
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.schemas.patient import PatientCreate, PatientUpdate
from app.services import patient_service
from app.models.patient import Patient
from app.models.auth import User


def make_user(db: Session) -> User:
    user = User(phone=f"+555{uuid.uuid4().hex[:7]}", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_create_patient_service(db_session: Session):
    user = make_user(db_session)
    obj_in = PatientCreate(full_name="Service Test Patient", phone="+911111111111")
    patient = patient_service.create_patient(db_session, obj_in, creator_id=user.id)

    assert patient.full_name == "Service Test Patient"
    assert patient.created_by_user_id == user.id


def test_get_patient_service_not_found(db_session: Session):
    random_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        patient_service.get_patient(db_session, random_id)
    assert exc_info.value.status_code == 404


def test_search_patients_service_min_length(db_session: Session):
    # Service layer should handle min length check if it's there
    # (Though API layer also handles it via Query)
    results = patient_service.search_patients(db_session, "A")
    assert results == []


def test_update_patient_service(db_session: Session):
    patient = Patient(full_name="Before Update")
    db_session.add(patient)
    db_session.commit()

    user = make_user(db_session)
    obj_in = PatientUpdate(full_name="After Update")
    updated = patient_service.update_patient(db_session, patient.id, obj_in, updater_id=user.id)

    assert updated.full_name == "After Update"
    assert updated.updated_by_user_id == user.id
    assert updated.record_version == 2


def test_create_patient_normalization_service(db_session: Session):
    user = make_user(db_session)
    obj_in = PatientCreate(full_name="Child Patient", phone="9939674571")
    patient = patient_service.create_patient(db_session, obj_in, creator_id=user.id)

    assert patient.full_name == "Child Patient"
    assert patient.phone == "+919939674571"
    
    # Verify the associated user is created with the normalized phone
    assert patient.user_id is not None
    linked_user = db_session.query(User).filter(User.id == patient.user_id).first()
    assert linked_user is not None
    assert linked_user.phone == "+919939674571"
