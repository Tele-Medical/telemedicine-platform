import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.models.auth import User
from app.models.patient import Patient
from app.models.practitioner import Practitioner
from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse

router = APIRouter()


@router.post("/", response_model=AppointmentResponse)
def create_appointment(
    *,
    db: Session = Depends(deps.get_db),
    appt_in: AppointmentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a new appointment."""
    patient = db.query(Patient).filter(Patient.id == appt_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if appt_in.practitioner_id:
        practitioner = (
            db.query(Practitioner).filter(Practitioner.id == appt_in.practitioner_id).first()
        )
        if not practitioner:
            raise HTTPException(status_code=404, detail="Practitioner not found")

    if current_user.default_role == "practitioner":
        practitioner = (
            db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
        )
        if not practitioner:
            raise HTTPException(status_code=403, detail="Practitioner profile not found")

    appt = Appointment(
        patient_id=appt_in.patient_id,
        practitioner_id=appt_in.practitioner_id,
        channel=appt_in.channel,
        scheduled_for=appt_in.scheduled_for,
        created_by_user_id=current_user.id,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


@router.get("/", response_model=List[AppointmentResponse])
def get_appointments(
    patient_id: uuid.UUID | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Retrieve appointments."""
    query = db.query(Appointment)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)

    if current_user.default_role == "patient":
        query = query.filter(Appointment.created_by_user_id == current_user.id)
    elif current_user.default_role == "practitioner":
        practitioner = (
            db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
        )
        if practitioner:
            query = query.filter(Appointment.practitioner_id == practitioner.id)

    return query.offset(skip).limit(limit).all()


@router.patch("/{id}", response_model=AppointmentResponse)
def update_appointment(
    *,
    db: Session = Depends(deps.get_db),
    id: uuid.UUID,
    appt_in: AppointmentUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update an appointment."""
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user.default_role == "patient" and appt.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if current_user.default_role == "practitioner":
        practitioner = (
            db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
        )
        if not practitioner:
            raise HTTPException(status_code=403, detail="Practitioner profile not found")
        if appt.practitioner_id and appt.practitioner_id != practitioner.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this appointment")

    appt.status = appt_in.status
    appt.updated_by_user_id = current_user.id
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


@router.get("/queue")
def get_doctor_queue(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Retrieve appointments for the current doctor with patient names."""
    if current_user.default_role not in ["doctor", "practitioner", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    practitioner = db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
    if not practitioner and current_user.default_role != "admin":
        raise HTTPException(status_code=403, detail="Practitioner profile not found")

    query = db.query(Appointment, Patient.full_name).join(
        Patient, Appointment.patient_id == Patient.id
    )
    if practitioner:
        query = query.filter(Appointment.practitioner_id == practitioner.id)

    # Filter out completed and cancelled appointments to keep the queue clean
    query = query.filter(Appointment.status.notin_(["completed", "cancelled"]))

    results = query.all()

    return [
        {
            "id": str(appt.id),
            "patientName": full_name,
            "time": appt.scheduled_for.isoformat()
            if appt.scheduled_for
            else appt.created_at.isoformat(),
            "status": appt.status,
        }
        for appt, full_name in results
    ]


@router.get("/{id}")
def get_appointment_details(
    id: uuid.UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Retrieve detailed appointment information including patient and practitioner names."""
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Enforce ownership/role checks to prevent IDOR
    if current_user.default_role not in ["admin", "staff"]:
        if current_user.default_role == "patient":
            patient = (
                db.query(Patient).filter(Patient.created_by_user_id == current_user.id).first()
            )
            if not patient or appt.patient_id != patient.id:
                raise HTTPException(
                    status_code=403, detail="Not authorized to access this appointment"
                )
        elif current_user.default_role in ["doctor", "practitioner"]:
            practitioner = (
                db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
            )
            if not practitioner or appt.practitioner_id != practitioner.id:
                raise HTTPException(
                    status_code=403, detail="Not authorized to access this appointment"
                )

    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    patient_name = patient.full_name if patient else "Patient"

    practitioner_name = "Doctor"
    if appt.practitioner_id:
        practitioner = (
            db.query(Practitioner).filter(Practitioner.id == appt.practitioner_id).first()
        )
        practitioner_name = practitioner.full_name if practitioner else "Doctor"

    return {
        "id": str(appt.id),
        "patient_id": str(appt.patient_id),
        "patient_name": patient_name,
        "practitioner_id": str(appt.practitioner_id) if appt.practitioner_id else None,
        "practitioner_name": practitioner_name,
        "status": appt.status,
        "channel": appt.channel,
        "scheduled_for": appt.scheduled_for.isoformat() if appt.scheduled_for else None,
    }
