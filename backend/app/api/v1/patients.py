from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.api.deps import get_db, get_current_user
from app.schemas.identity import IdentifierCreate, IdentifierResponse
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate
from app.services import identity_service, patient_service
from app.models.auth import User
from app.services.audit_service import AuditService

router = APIRouter()

@router.post("/", response_model=PatientRead)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return patient_service.create_patient(db, payload, creator_id=current_user.id)

@router.get("/", response_model=List[PatientRead])
def search_patients(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return patient_service.search_patients(db, q)

@router.get("/{id}", response_model=PatientRead)
def get_patient(
    id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = patient_service.get_patient(db, id)
    AuditService.log_access(
        db=db,
        target_entity_type="patients",
        target_entity_id=patient.id,
        actor_user_id=current_user.id,
        action="read",
        request=request
    )
    return patient

@router.patch("/{id}", response_model=PatientRead)
def update_patient(
    id: UUID,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return patient_service.update_patient(db, id, payload, updater_id=current_user.id)

@router.get("/{id}/identifiers", response_model=list[IdentifierResponse])
def get_patient_identifiers(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return identity_service.get_identifiers(db, id)

@router.post("/{id}/identifiers", response_model=IdentifierResponse)
def create_patient_identifier(
    id: UUID,
    payload: IdentifierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return identity_service.link_identifier(db, id, payload)
