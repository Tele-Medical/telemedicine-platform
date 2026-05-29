import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.auth import User
from app.models.clinical import CareLoop
from app.models.patient import Patient
from app.models.practitioner import Practitioner
from app.schemas.care_loop import CareLoopCreate, CareLoopResponse, CareLoopResolve
from app.api.v1.clinical import create_provenance_event

router = APIRouter()


@router.post("/", response_model=CareLoopResponse)
def create_care_loop(
    *,
    db: Session = Depends(deps.get_db),
    care_loop_in: CareLoopCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Initialize a new Care Loop for a patient.
    """
    if current_user.default_role == "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patients cannot initialize care loops",
        )

    # Validate patient exists
    patient = db.query(Patient).filter(Patient.id == care_loop_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Validate practitioner exists
    practitioner = db.query(Practitioner).filter(Practitioner.id == care_loop_in.practitioner_id).first()
    if not practitioner:
        raise HTTPException(status_code=404, detail="Practitioner not found")

    # Check if there is already an active care loop for this patient
    existing_loop = (
        db.query(CareLoop)
        .filter(CareLoop.patient_id == care_loop_in.patient_id, CareLoop.status == "active")
        .first()
    )
    if existing_loop:
        return existing_loop

    care_loop = CareLoop(
        patient_id=care_loop_in.patient_id,
        practitioner_id=care_loop_in.practitioner_id,
        chief_complaint=care_loop_in.chief_complaint,
        status="active",
    )
    db.add(care_loop)
    db.commit()
    db.refresh(care_loop)

    create_provenance_event(db, "care_loops", care_loop.id, "create", current_user.id)
    db.commit()

    return care_loop


@router.get("/active", response_model=Optional[CareLoopResponse])
def get_active_care_loop(
    *,
    db: Session = Depends(deps.get_db),
    patient_id: uuid.UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve the active care loop for a patient.
    """
    # Enforce basic ownership / role check
    if current_user.default_role == "patient":
        # Check if the patient belongs to the current user
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient or patient.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this patient's clinical records",
            )

    care_loop = (
        db.query(CareLoop)
        .filter(CareLoop.patient_id == patient_id, CareLoop.status == "active")
        .first()
    )
    return care_loop


@router.get("/latest-resolved", response_model=Optional[CareLoopResponse])
def get_latest_resolved_care_loop(
    *,
    db: Session = Depends(deps.get_db),
    patient_id: uuid.UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve the latest resolved care loop for a patient.
    """
    if current_user.default_role == "patient":
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient or patient.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this patient's clinical records",
            )

    care_loop = (
        db.query(CareLoop)
        .filter(CareLoop.patient_id == patient_id, CareLoop.status == "completed")
        .order_by(CareLoop.resolved_at.desc())
        .first()
    )
    return care_loop


@router.post("/{id}/resolve", response_model=CareLoopResponse)
def resolve_care_loop(
    *,
    db: Session = Depends(deps.get_db),
    id: uuid.UUID,
    resolve_in: CareLoopResolve,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Mark a care loop as resolved (Cured / All Good).
    """
    if current_user.default_role == "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patients cannot resolve care loops",
        )

    care_loop = db.query(CareLoop).filter(CareLoop.id == id).first()
    if not care_loop:
        raise HTTPException(status_code=404, detail="Care loop not found")

    care_loop.status = "completed"
    care_loop.resolved_at = datetime.now(timezone.utc)
    care_loop.resolution_notes = resolve_in.resolution_notes
    db.add(care_loop)
    db.commit()
    db.refresh(care_loop)

    create_provenance_event(db, "care_loops", care_loop.id, "update", current_user.id)
    db.commit()

    return care_loop
