import uuid
from datetime import datetime, timezone
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.models.auth import User
from app.models.patient import Patient
from app.models.practitioner import Practitioner
from app.models.appointment import Appointment
from app.models.encounter import Encounter
from app.models.clinical import CareLoop
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

    # Prevent duplicate encounters by checking for an existing in-progress encounter for this appointment
    if enc_in.appointment_id:
        existing_enc = (
            db.query(Encounter)
            .filter(
                Encounter.appointment_id == enc_in.appointment_id,
                Encounter.status == "in_progress",
            )
            .first()
        )
        if existing_enc:
            return existing_enc

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
    return populate_encounter_practitioner(db, enc)


def populate_encounter_practitioner(db: Session, enc: Encounter) -> Encounter:
    enc.practitioner_name = None
    enc.practitioner_role = None
    if enc.practitioner_id:
        practitioner = db.query(Practitioner).filter(Practitioner.id == enc.practitioner_id).first()
        if practitioner:
            enc.practitioner_name = practitioner.full_name
            enc.practitioner_role = practitioner.specialty_category
    return enc


@router.get("/", response_model=List[EncounterResponse])
def list_encounters(
    patient_id: uuid.UUID = Query(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List clinical encounters for a patient."""
    if current_user.default_role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or patient.id != patient_id:
            raise HTTPException(status_code=403, detail="Not authorized to access these encounters")

    encounters = db.query(Encounter).filter(Encounter.patient_id == patient_id).order_by(Encounter.created_at.desc()).all()
    for enc in encounters:
        populate_encounter_practitioner(db, enc)
    return encounters


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

    return populate_encounter_practitioner(db, enc)


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

    # Manage CareLoop lifecycle
    # 1. Check if there's an active care loop for this patient
    care_loop = (
        db.query(CareLoop)
        .filter(CareLoop.patient_id == enc.patient_id, CareLoop.status == "active")
        .first()
    )

    practitioner_profile_id = None
    if current_user.default_role == "practitioner":
        practitioner = (
            db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
        )
        if practitioner:
            practitioner_profile_id = practitioner.id
    if not practitioner_profile_id:
        practitioner_profile_id = enc.practitioner_id

    # If no active care loop exists, initialize one
    if not care_loop:
        # Resolve chief complaint
        chief_complaint = "Telemedicine Consultation"
        if enc.appointment_id:
            appt = db.query(Appointment).filter(Appointment.id == enc.appointment_id).first()
            if appt and appt.chief_complaint:
                chief_complaint = appt.chief_complaint

        care_loop = CareLoop(
            patient_id=enc.patient_id,
            practitioner_id=practitioner_profile_id or enc.practitioner_id,
            chief_complaint=chief_complaint,
            status="active",
        )
        db.add(care_loop)
        db.flush()

    enc.care_loop_id = care_loop.id

    # 2. Update parent appointment if linked
    if enc.appointment_id:
        appt = db.query(Appointment).filter(Appointment.id == enc.appointment_id).first()
        if appt:
            appt.care_loop_id = care_loop.id
            if appt.status not in ("completed", "cancelled"):
                appt.status = "completed"
                appt.updated_by_user_id = current_user.id
                db.add(appt)

    # 3. Handle outcomes:
    if summary_in.outcome == "completed":
        # All Good / Discharged -> Complete the care loop
        care_loop.status = "completed"
        care_loop.resolved_at = datetime.now(timezone.utc)
        care_loop.resolution_notes = summary_in.resolution_notes or summary_in.clinical_summary
        db.add(care_loop)
    elif summary_in.outcome == "follow_up":
        # Needs follow-up -> Book follow-up if date is provided
        if summary_in.follow_up_date:
            channel = "telemedicine"
            if enc.appointment_id:
                appt = db.query(Appointment).filter(Appointment.id == enc.appointment_id).first()
                if appt and appt.channel:
                    channel = appt.channel

            follow_up_appt = Appointment(
                patient_id=enc.patient_id,
                practitioner_id=practitioner_profile_id or enc.practitioner_id,
                care_loop_id=care_loop.id,
                channel=channel,
                scheduled_for=summary_in.follow_up_date,
                created_by_user_id=current_user.id,
                chief_complaint=f"Follow-up: {summary_in.clinical_summary[:100]}...",
                status="confirmed",  # Pre-confirmed by practitioner
            )
            db.add(follow_up_appt)

    db.add(enc)
    db.commit()
    db.refresh(enc)
    return populate_encounter_practitioner(db, enc)
