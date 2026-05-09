from sqlalchemy.orm import Session
from sqlalchemy import or_
from uuid import UUID
from typing import List, Optional
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate

def get_by_id(db: Session, patient_id: UUID) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.id == patient_id, Patient.is_active).first()

def create(db: Session, obj_in: PatientCreate, created_by_id: Optional[UUID] = None) -> Patient:
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
    update_data = obj_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    
    db_obj.updated_by_user_id = updated_by_id
    db_obj.record_version += 1
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def search(db: Session, query: str, limit: int = 20) -> List[Patient]:
    """
    Search patients by name or phone (prefix match).
    """
    search_filter = or_(
        Patient.full_name.ilike(f"%{query}%"),
        Patient.phone.like(f"{query}%")
    )
    return db.query(Patient).filter(search_filter, Patient.is_active).limit(limit).all()
