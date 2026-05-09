import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.auth import User
from app.models.patient import Patient
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
    patient = db.query(Patient).filter(Patient.id == appt_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    appt = Appointment(
        patient_id=appt_in.patient_id,
        practitioner_id=appt_in.practitioner_id,
        channel=appt_in.channel,
        scheduled_for=appt_in.scheduled_for,
        created_by_user_id=current_user.id
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt

@router.get("/", response_model=List[AppointmentResponse])
def get_appointments(
    patient_id: uuid.UUID | None = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    query = db.query(Appointment)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    return query.all()

@router.patch("/{id}", response_model=AppointmentResponse)
def update_appointment(
    *,
    db: Session = Depends(deps.get_db),
    id: uuid.UUID,
    appt_in: AppointmentUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    appt.status = appt_in.status
    appt.updated_by_user_id = current_user.id
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt
