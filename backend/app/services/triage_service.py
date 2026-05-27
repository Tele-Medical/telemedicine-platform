from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.practitioner import Practitioner
from app.schemas.symptom_intake import SymptomIntakeBase

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

    # Try to find an available practitioner for the specialty
    practitioner = db.query(Practitioner).filter(
        Practitioner.specialty_category == specialty,
        Practitioner.is_active == True
    ).first()
    
    practitioner_id = practitioner.id if practitioner else None
    
    # Fallback to General Medicine if no specialist is available
    if not practitioner_id and specialty != "General Medicine":
        specialty = "General Medicine"
        fallback = db.query(Practitioner).filter(
            Practitioner.specialty_category == "General Medicine",
            Practitioner.is_active == True
        ).first()
        practitioner_id = fallback.id if fallback else None
        
    return {
        "specialty_category": specialty,
        "triage_priority": priority,
        "practitioner_id": practitioner_id
    }
