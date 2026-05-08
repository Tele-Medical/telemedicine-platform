from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.identity import IdentifierCreate, IdentifierResponse
from app.services import identity_service
from app.models.auth import User
from uuid import UUID

router = APIRouter()

@router.get("/{id}/identifiers", response_model=list[IdentifierResponse])
def get_patient_identifiers(id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return identity_service.get_identifiers(db, id)

@router.post("/{id}/identifiers", response_model=IdentifierResponse)
def create_patient_identifier(id: UUID, payload: IdentifierCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return identity_service.link_identifier(db, id, payload)
