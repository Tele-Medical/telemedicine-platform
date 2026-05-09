from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from app.models.practitioner import Practitioner

def get_by_id(db: Session, practitioner_id: UUID) -> Optional[Practitioner]:
    return db.query(Practitioner).filter(Practitioner.id == practitioner_id, Practitioner.is_active).first()

def get_by_user_id(db: Session, user_id: UUID) -> Optional[Practitioner]:
    return db.query(Practitioner).filter(Practitioner.user_id == user_id, Practitioner.is_active).first()

def list_all(db: Session, skip: int = 0, limit: int = 100) -> List[Practitioner]:
    return db.query(Practitioner).filter(Practitioner.is_active).offset(skip).limit(limit).all()
