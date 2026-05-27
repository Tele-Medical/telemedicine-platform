from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.models.practitioner import Practitioner
from app.models.appointment import Appointment
from app.schemas.symptom_intake import SymptomIntakeBase

def get_least_loaded_practitioner(db: Session, specialty: str):
    """Finds the least loaded active practitioner for a given specialty."""
    result = (
        db.query(Practitioner.id)
        .outerjoin(
            Appointment,
            (Appointment.practitioner_id == Practitioner.id)
            & (Appointment.status.notin_(["completed", "cancelled"]))
        )
        .filter(
            Practitioner.specialty_category == specialty,
            Practitioner.is_active
        )
        .group_by(Practitioner.id)
        .order_by(func.count(Appointment.id).asc())
        .first()
    )
    return result[0] if result else None

def evaluate_symptoms_and_route(db: Session, intake: SymptomIntakeBase) -> Dict[str, Any]:
    """
    Evaluates symptoms against clinical rules and returns routing info.
    Returns: { 'specialty_category': str, 'triage_priority': str }
    """
    symptoms = intake.symptoms or []
    symptoms_lower = [s.lower() for s in symptoms]
    
    # Defaults
    specialty = "General Medicine"
    priority = "Standard"
    
    # Cardiology Rules
    cardio_keywords = ["chest pain", "palpitations", "shortness of breath", "heart"]
    if any(k in s for s in symptoms_lower for k in cardio_keywords):
        specialty = "Cardiology"
        if intake.severity and intake.severity.lower() in ["severe", "emergency"]:
            priority = "Critical"
        else:
            priority = "Urgent"
            
    # Neurology Rules
    neuro_keywords = ["headache", "dizzy", "dizziness", "seizure", "numbness"]
    if any(k in s for s in symptoms_lower for k in neuro_keywords):
        specialty = "Neurology"
        if "seizure" in symptoms_lower or (intake.severity and "severe" in intake.severity.lower()):
            priority = "Urgent"

    # Pediatrics Rules
    peds_keywords = ["child", "infant", "baby"]
    if any(k in s for s in symptoms_lower for k in peds_keywords) or (intake.raw_text and any(k in intake.raw_text.lower() for k in peds_keywords)):
        specialty = "Pediatrics"

    # Dermatolgy Rules
    derm_keywords = ["rash", "skin", "itch", "acne", "hive"]
    if any(k in s for s in symptoms_lower for k in derm_keywords) or (intake.raw_text and any(k in intake.raw_text.lower() for k in derm_keywords)):
        specialty = "Dermatology"

    # Orthopedics Rules
    ortho_keywords = ["bone", "joint", "fracture", "knee", "back pain", "muscle"]
    if any(k in s for s in symptoms_lower for k in ortho_keywords) or (intake.raw_text and any(k in intake.raw_text.lower() for k in ortho_keywords)):
        specialty = "Orthopedics"

    # Try to find an available practitioner for the specialty using Least-Loaded assignment
    practitioner_id = get_least_loaded_practitioner(db, specialty)
    
    # Fallback to General Medicine if no specialist is available
    if not practitioner_id and specialty != "General Medicine":
        specialty = "General Medicine"
        practitioner_id = get_least_loaded_practitioner(db, specialty)
        
    return {
        "specialty_category": specialty,
        "triage_priority": priority,
        "practitioner_id": practitioner_id
    }
