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
from app.models.auth import User


def normalize_phone(phone: str | None) -> str | None:
    """
    Normalizes India country-code phone numbers to E.164 format (+91XXXXXXXXXX).
    If phone is empty or doesn't meet standard length, returns as is.
    """
    if not phone:
        return None
    # Strip any non-digit characters
    clean = "".join(filter(str.isdigit, phone))
    # If the clean number ends with a 10-digit number, prepend +91
    if len(clean) >= 10:
        return f"+91{clean[-10:]}"
    return phone


def get_patient(db: Session, patient_id: UUID) -> Patient:
    """
    Retrieves a single patient record by its unique ID.
    Raises 404 if the patient does not exist.
    """
    patient = patient_repo.get_by_id(db, patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


def create_patient(db: Session, obj_in: PatientCreate, creator_id: UUID) -> Patient:
    """
    Creates a new patient record in the system.
    Supports both standard self-registration and assisted registration (e.g. for children).
    Family Account model: If a phone number is provided, ensure a User exists for that phone,
    and link this Patient to that User.
    """
    if obj_in.phone:
        obj_in.phone = normalize_phone(obj_in.phone)

    user_id = None
    creator = db.query(User).filter(User.id == creator_id).first()

    if creator and creator.default_role == "patient":
        # If the creator is a patient, all patients they create are family members,
        # so they must be grouped under the creator's family account user ID to appear in /me/family.
        user_id = creator_id

        # If a phone was provided, still ensure a User exists for optional future independent logins
        if obj_in.phone:
            # Try exact match first to prevent UniqueViolation from duplicate legacy accounts
            user = db.query(User).filter(User.phone == obj_in.phone).first()
            if not user:
                # Suffix fallback match
                clean_phone = "".join(filter(str.isdigit, obj_in.phone))
                if len(clean_phone) >= 10:
                    clean_suffix = clean_phone[-10:]
                    user = db.query(User).filter(User.phone.like(f"%{clean_suffix}")).first()
                    if user and user.phone:
                        user.phone = obj_in.phone
                        db.flush()
                else:
                    user = db.query(User).filter(User.phone == obj_in.phone).first()

            if not user:
                user = User(phone=obj_in.phone, full_name=obj_in.full_name, default_role="patient")
                db.add(user)
                db.flush()
    else:
        # Standard workflow for staff/ASHA workers: link to independent user account if phone is provided
        if obj_in.phone:
            # Try exact match first to prevent UniqueViolation from duplicate legacy accounts
            user = db.query(User).filter(User.phone == obj_in.phone).first()
            if not user:
                # Suffix fallback match
                clean_phone = "".join(filter(str.isdigit, obj_in.phone))
                if len(clean_phone) >= 10:
                    clean_suffix = clean_phone[-10:]
                    user = db.query(User).filter(User.phone.like(f"%{clean_suffix}")).first()
                    if user and user.phone:
                        user.phone = obj_in.phone
                        db.flush()
                else:
                    user = db.query(User).filter(User.phone == obj_in.phone).first()

            if not user:
                # Create a new user account for this phone
                user = User(phone=obj_in.phone, full_name=obj_in.full_name, default_role="patient")
                db.add(user)
                db.flush()  # flush to get user.id
            user_id = user.id

    patient_data = obj_in.model_dump(exclude_unset=True)
    if user_id:
        patient_data["user_id"] = user_id
        # Sync the phone number of the family member with the primary User account phone number
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.phone:
            patient_data["phone"] = user.phone

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
    if obj_in.phone:
        obj_in.phone = normalize_phone(obj_in.phone)

    patient = get_patient(db, patient_id)
    
    # Sync the phone number of the family member with the primary User account phone number
    if patient.user_id:
        user = db.query(User).filter(User.id == patient.user_id).first()
        if user:
            if user.phone:
                user.phone = normalize_phone(user.phone)
            if user.phone:
                obj_in.phone = user.phone
            
    return patient_repo.update(db, patient, obj_in, updated_by_id=updater_id)


def search_patients(db: Session, query: str) -> List[Patient]:
    """
    Searches for patients by name or phone number.
    Returns an empty list if the search query is too short (min 2 characters).
    """
    query = query.strip()
    if len(query) < 2:
        return []

    # If query is a 10-digit phone number, check if a User exists with this phone but no Patient record
    clean_query = "".join(filter(str.isdigit, query))
    if len(clean_query) == 10:
        # Find any user with this phone who has patient role
        user = (
            db.query(User)
            .filter(User.phone.like(f"%{clean_query}"), User.default_role == "patient")
            .first()
        )
        if user:
            # Check if this user has any patient record
            patient = db.query(Patient).filter(Patient.user_id == user.id).first()
            if not patient:
                # Auto-create the patient record so they show up in lookups!
                patient = Patient(
                    full_name=user.full_name or "Patient",
                    phone=user.phone,
                    preferred_language="pa",
                    user_id=user.id,
                    created_by_user_id=user.id,
                )
                db.add(patient)
                db.commit()
                db.refresh(patient)

    return patient_repo.search(db, query)
