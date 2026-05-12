from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.api.deps import get_db, get_current_user
from app.models.auth import User
from app.schemas.audit import ConsentCreate, ConsentUpdate, ConsentResponse
from app.services.audit_service import ConsentService

router = APIRouter()

@router.get("/{patient_id}/consents", response_model=List[ConsentResponse])
def get_patient_consents(patient_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieve all active and historical consents for a specific patient.
    Requires patient self-authorization or staff role.
    """
    return ConsentService.get_patient_consents(db, patient_id, current_user)

@router.post("/{patient_id}/consents", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
def create_patient_consent(patient_id: uuid.UUID, request: ConsentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a new consent grant for a specific patient.
    Requires patient self-authorization or staff role.
    """
    return ConsentService.create_consent(db, patient_id, request, current_user)

@router.patch("/{patient_id}/consents/{consent_id}", response_model=ConsentResponse)
def update_patient_consent(patient_id: uuid.UUID, consent_id: uuid.UUID, request: ConsentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update the status of an existing consent (e.g., revoke or expire).
    Requires patient self-authorization or staff role.
    """
    return ConsentService.update_consent(db, patient_id, consent_id, request, current_user)
