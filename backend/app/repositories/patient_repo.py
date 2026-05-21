"""
Data Access Object (DAO) for Patient records.
Handles all direct SQLAlchemy operations for the Patient table.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from uuid import UUID
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate

def get_by_id(db: Session, patient_id: UUID) -> Optional[Patient]:
    """
    Fetches an active patient record by its UUID.
    """
    return db.query(Patient).filter(Patient.id == patient_id, Patient.is_active).first()

def create(db: Session, obj_in: PatientCreate, created_by_id: Optional[UUID] = None) -> Patient:
    """
    Persists a new Patient record to the database.
    """
    db_obj = Patient(
        **obj_in.model_dump(),
        created_by_user_id=created_by_id,
        updated_by_user_id=created_by_id
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update(db: Session, db_obj: Patient, obj_in: PatientUpdate, updated_by_id: Optional[UUID] = None) -> Patient:
    """
    Performs an atomic update using version-based optimistic concurrency control.
    Prevents race conditions by ensuring the record_version hasn't changed.
    """
    # Perform an atomic update to prevent lost updates (Optimistic Locking)
    current_version = db_obj.record_version
    update_data = obj_in.model_dump(exclude_unset=True)
    
    # Prepare update query
    stmt = (
        Patient.__table__.update()
        .where(Patient.id == db_obj.id)
        .where(Patient.record_version == current_version)
        .values(
            **update_data,
            updated_by_user_id=updated_by_id,
            record_version=current_version + 1,
            updated_at=datetime.now(timezone.utc)
        )
    )
    
    import typing
    from sqlalchemy import CursorResult
    result = db.execute(stmt)
    if typing.cast(CursorResult, result).rowcount == 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict detected: The record has been modified by another process."
        )
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

def search(db: Session, query: str, limit: int = 20) -> List[Patient]:
    """
    Search active patients by name (partial match) or phone (prefix match).
    """
    search_filter = or_(
        Patient.full_name.ilike(f"%{query}%"),
        Patient.phone.like(f"{query}%")
    )
    return db.query(Patient).filter(search_filter, Patient.is_active).limit(limit).all()
