import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.auth import User
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.schemas.encounter import EncounterCreate, EncounterSummary, EncounterResponse

router = APIRouter()

@router.post("/", response_model=EncounterResponse)
def create_encounter(
    *,
    db: Session = Depends(deps.get_db),
    enc_in: EncounterCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    patient = db.query(Patient).filter(Patient.id == enc_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    enc = Encounter(
        appointment_id=enc_in.appointment_id,
        patient_id=enc_in.patient_id,
        practitioner_id=enc_in.practitioner_id,
        encounter_mode=enc_in.encounter_mode,
        created_by_user_id=current_user.id
    )
    db.add(enc)
    db.commit()
    db.refresh(enc)
    return enc

@router.get("/{id}", response_model=EncounterResponse)
def get_encounter(
    *,
    db: Session = Depends(deps.get_db),
    id: uuid.UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    enc = db.query(Encounter).filter(Encounter.id == id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return enc

@router.post("/{id}/summary", response_model=EncounterResponse)
def submit_encounter_summary(
    *,
    db: Session = Depends(deps.get_db),
    id: uuid.UUID,
    summary_in: EncounterSummary,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    # Only staff can submit summary
    if current_user.default_role == "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        
    enc = db.query(Encounter).filter(Encounter.id == id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
        
    enc.clinical_summary = summary_in.clinical_summary
    if summary_in.outcome:
        enc.outcome = summary_in.outcome
        
    enc.status = "completed"
    enc.record_version += 1
    enc.updated_by_user_id = current_user.id
    
    db.add(enc)
    db.commit()
    db.refresh(enc)
    return enc
