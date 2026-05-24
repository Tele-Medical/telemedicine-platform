from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.api.deps import get_db, get_current_user
from app.schemas.practitioner import PractitionerRead
from app.services import practitioner_service
from app.models.auth import User

router = APIRouter()


@router.get("/", response_model=List[PractitionerRead])
def list_practitioners(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return practitioner_service.list_practitioners(db, skip=skip, limit=limit)


@router.get("/{id}", response_model=PractitionerRead)
def get_practitioner(
    id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return practitioner_service.get_practitioner(db, id)
