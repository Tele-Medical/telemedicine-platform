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
from app.services.triage_service import evaluate_symptoms_and_route
from app.models.symptom_intake import SymptomIntake

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

    practitioner_id = appt_in.practitioner_id
    triage_priority = appt_in.triage_priority

    # If no practitioner is provided but we have symptom intake, auto-route
    if not practitioner_id and appt_in.symptom_intake:
        routing = evaluate_symptoms_and_route(db, appt_in.symptom_intake)
        practitioner_id = routing["practitioner_id"]
        triage_priority = routing["triage_priority"]

    if practitioner_id:
        practitioner = (
            db.query(Practitioner).filter(Practitioner.id == practitioner_id).first()
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
        practitioner_id=practitioner_id,
        channel=appt_in.channel,
        scheduled_for=appt_in.scheduled_for,
        created_by_user_id=current_user.id,
        chief_complaint=appt_in.chief_complaint,
        triage_priority=triage_priority,
        notes=appt_in.notes,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    # Save SymptomIntake if provided
    if appt_in.symptom_intake:
        intake = SymptomIntake(
            appointment_id=appt.id,
            raw_text=appt_in.symptom_intake.raw_text,
            symptoms=appt_in.symptom_intake.symptoms,
            duration=appt_in.symptom_intake.duration,
            severity=appt_in.symptom_intake.severity
        )
        db.add(intake)
        db.commit()

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

    results = query.offset(skip).limit(limit).all()
    for appt in results:
        appt.practitioner_name = None
        appt.practitioner_role = None
        if appt.practitioner_id:
            practitioner = db.query(Practitioner).filter(Practitioner.id == appt.practitioner_id).first()
            if practitioner:
                appt.practitioner_name = practitioner.full_name
                appt.practitioner_role = practitioner.specialty_category
    return results


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
    from datetime import datetime, date, timezone

    if current_user.default_role not in ["doctor", "practitioner", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    practitioner = db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
    if not practitioner and current_user.default_role != "admin":
        raise HTTPException(status_code=403, detail="Practitioner profile not found")

    query = db.query(Appointment, Patient).join(Patient, Appointment.patient_id == Patient.id)
    if practitioner:
        query = query.filter(Appointment.practitioner_id == practitioner.id)

    # Filter out completed and cancelled appointments to keep the queue clean
    query = query.filter(Appointment.status.notin_(["completed", "cancelled"]))

    query = query.order_by(Appointment.created_at.asc(), Appointment.id.asc())
    results = query.all()
    now = datetime.now(timezone.utc)

    queue_list = []
    for appt, patient in results:
        # Calculate age dynamically
        age = 0
        if patient.date_of_birth:
            dob = patient.date_of_birth
            today = date.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        # Calculate wait time in minutes
        delta = now - appt.created_at
        minutes = int(delta.total_seconds() / 60)
        wait_time = f"{minutes} mins" if minutes > 0 else "0 mins"

        # Gender standardisation (capitalize)
        gender = patient.gender.capitalize() if patient.gender else "Unknown"

        queue_list.append(
            {
                "id": str(appt.id),
                "patientId": str(patient.id),
                "appointmentId": str(appt.id),
                "name": patient.full_name,
                "patientName": patient.full_name,
                "time": appt.scheduled_for.isoformat()
                if appt.scheduled_for
                else appt.created_at.isoformat(),
                "age": age,
                "gender": gender,
                "complaint": appt.chief_complaint or "No complaint specified",
                "triage": appt.triage_priority or "Standard",
                "waitTime": wait_time,
                "status": "Waiting" if appt.status == "requested" else "In Consultation",
            }
        )

    return queue_list


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
                db.query(Patient)
                .filter(Patient.created_by_user_id == current_user.id, Patient.id == appt.patient_id)
                .first()
            )
            if not patient:
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
        "chief_complaint": appt.chief_complaint,
        "triage_priority": appt.triage_priority,
        "notes": appt.notes,
    }
