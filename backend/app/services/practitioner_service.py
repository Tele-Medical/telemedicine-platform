from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from fastapi import HTTPException, status
from app.repositories import practitioner_repo
from app.models.practitioner import Practitioner


def get_practitioner(db: Session, practitioner_id: UUID) -> Practitioner:
    practitioner = practitioner_repo.get_by_id(db, practitioner_id)
    if not practitioner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practitioner not found")
    return practitioner


def list_practitioners(db: Session, specialty: str | None = None, skip: int = 0, limit: int = 100) -> List[Practitioner]:
    return practitioner_repo.list_all(db, specialty=specialty, skip=skip, limit=limit)
