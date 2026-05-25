import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.auth import User
from app.models.patient import Patient
from app.models.practitioner import Practitioner
from app.models.appointment import Appointment
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
    """Initialize a clinical encounter."""
    patient = db.query(Patient).filter(Patient.id == enc_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if enc_in.appointment_id:
        appt = db.query(Appointment).filter(Appointment.id == enc_in.appointment_id).first()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        if appt.patient_id != enc_in.patient_id:
            raise HTTPException(status_code=400, detail="Appointment patient mismatch")

    if enc_in.practitioner_id:
        prac = db.query(Practitioner).filter(Practitioner.id == enc_in.practitioner_id).first()
        if not prac:
            raise HTTPException(status_code=404, detail="Practitioner not found")

    if current_user.default_role == "patient":
        raise HTTPException(status_code=403, detail="Patients cannot create encounters")

    if current_user.default_role == "practitioner":
        practitioner = (
            db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
        )
        if not practitioner:
            raise HTTPException(status_code=403, detail="Practitioner profile not found")

    enc = Encounter(
        appointment_id=enc_in.appointment_id,
        patient_id=enc_in.patient_id,
        practitioner_id=enc_in.practitioner_id,
        encounter_mode=enc_in.encounter_mode,
        created_by_user_id=current_user.id,
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
    """Retrieve encounter details."""
    enc = db.query(Encounter).filter(Encounter.id == id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")

    if current_user.default_role == "practitioner":
        practitioner = (
            db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
        )
        if practitioner and enc.practitioner_id and enc.practitioner_id != practitioner.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this encounter")

    return enc


@router.post("/{id}/summary", response_model=EncounterResponse)
def submit_encounter_summary(
    *,
    db: Session = Depends(deps.get_db),
    id: uuid.UUID,
    summary_in: EncounterSummary,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Store the post-consultation summary."""
    if current_user.default_role == "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    enc = db.query(Encounter).filter(Encounter.id == id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")

    if current_user.default_role == "practitioner":
        practitioner = (
            db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
        )
        if not practitioner:
            raise HTTPException(status_code=403, detail="Practitioner profile not found")
        if enc.practitioner_id and enc.practitioner_id != practitioner.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this encounter")

    enc.clinical_summary = summary_in.clinical_summary
    if summary_in.outcome:
        enc.outcome = summary_in.outcome

    enc.status = "completed"
    enc.record_version += 1
    enc.updated_by_user_id = current_user.id

    # Cascade status update to associated parent appointment if linked
    if enc.appointment_id:
        appt = db.query(Appointment).filter(Appointment.id == enc.appointment_id).first()
        if appt and appt.status not in ("completed", "cancelled"):
            appt.status = "completed"
            appt.updated_by_user_id = current_user.id
            db.add(appt)

    db.add(enc)
    db.commit()
    db.refresh(enc)
    return enc
