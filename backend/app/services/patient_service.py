from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from fastapi import HTTPException, status
from app.repositories import patient_repo
from app.schemas.patient import PatientCreate, PatientUpdate
from app.models.patient import Patient

def get_patient(db: Session, patient_id: UUID) -> Patient:
    patient = patient_repo.get_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return patient

def create_patient(db: Session, obj_in: PatientCreate, creator_id: UUID) -> Patient:
    # Assisted Rule: If phone is missing, we must ensure name is valid (already checked by Pydantic)
    # In a real scenario, we might check for guardian info here if phone is None
    # For MVP, we allow creation if name is present.
    return patient_repo.create(db, obj_in, created_by_id=creator_id)

def update_patient(db: Session, patient_id: UUID, obj_in: PatientUpdate, updater_id: UUID) -> Patient:
    patient = get_patient(db, patient_id)
    return patient_repo.update(db, patient, obj_in, updated_by_id=updater_id)

def search_patients(db: Session, query: str) -> List[Patient]:
    query = query.strip()
    if len(query) < 2:
        return []
    return patient_repo.search(db, query)
