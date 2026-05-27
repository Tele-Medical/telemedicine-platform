"""
Service layer for patient-related operations.
Provides business logic for creating, retrieving, and searching patient records.
"""

from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from fastapi import HTTPException, status
from app.repositories import patient_repo
from app.schemas.patient import PatientCreate, PatientUpdate
from app.models.patient import Patient


def get_patient(db: Session, patient_id: UUID) -> Patient:
    """
    Retrieves a single patient record by its unique ID.
    Raises 404 if the patient does not exist.
    """
    patient = patient_repo.get_by_id(db, patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


from app.models.auth import User

def create_patient(db: Session, obj_in: PatientCreate, creator_id: UUID) -> Patient:
    """
    Creates a new patient record in the system.
    Supports both standard self-registration and assisted registration (e.g. for children).
    Family Account model: If a phone number is provided, ensure a User exists for that phone,
    and link this Patient to that User.
    """
    user_id = None
    if obj_in.phone:
        user = db.query(User).filter(User.phone == obj_in.phone).first()
        if not user:
            # Create a new user account for this phone
            user = User(
                phone=obj_in.phone,
                full_name=obj_in.full_name,
                default_role="patient"
            )
            db.add(user)
            db.flush() # flush to get user.id
        user_id = user.id

    patient_data = obj_in.model_dump(exclude_unset=True)
    if user_id:
        patient_data["user_id"] = user_id

    # Create patient via repo
    db_obj = Patient(**patient_data)
    db_obj.created_by_user_id = creator_id
    db_obj.updated_by_user_id = creator_id
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_patient(
    db: Session, patient_id: UUID, obj_in: PatientUpdate, updater_id: UUID
) -> Patient:
    """
    Updates an existing patient record with new data.
    Ensures the record exists before applying changes.
    """
    patient = get_patient(db, patient_id)
    return patient_repo.update(db, patient, obj_in, updated_by_id=updater_id)


def search_patients(db: Session, query: str) -> List[Patient]:
    """
    Searches for patients by name or phone number.
    Returns an empty list if the search query is too short (min 2 characters).
    """
    query = query.strip()
    if len(query) < 2:
        return []
    return patient_repo.search(db, query)
