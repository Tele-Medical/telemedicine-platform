import re
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
            & (Appointment.status.notin_(["completed", "cancelled"])),
        )
        .filter(Practitioner.specialty_category == specialty, Practitioner.is_active)
        .group_by(Practitioner.id)
        .order_by(func.count(Appointment.id).asc())
        .first()
    )
    return result[0] if result else None


def match_keywords(keywords: list, symptoms_lower: list, raw_text: str | None) -> bool:
    """Helper to check for word-boundary matching on symptoms or raw text to prevent false positives."""
    for s in symptoms_lower:
        for kw in keywords:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, s):
                return True
    if raw_text:
        raw_text_lower = raw_text.lower()
        for kw in keywords:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, raw_text_lower):
                return True
    return False


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
    cardio_keywords = [
        "chest pain",
        "palpitations",
        "shortness of breath",
        "heart",
        "cardiac",
        "chest tightness",
        "chest pressure",
        "breathless",
        "breathlessness",
        "angina",
        "irregular heartbeat",
        "arrhythmia",
        "racing pulse",
        "racing heart",
    ]
    if match_keywords(cardio_keywords, symptoms_lower, intake.raw_text):
        specialty = "Cardiology"
        if intake.severity and intake.severity.lower() in ["severe", "emergency"]:
            priority = "Critical"
        else:
            priority = "Urgent"

    # Neurology Rules
    neuro_keywords = [
        "headache",
        "dizzy",
        "dizziness",
        "seizure",
        "numbness",
        "migraine",
        "vertigo",
        "tingling",
        "paralysis",
        "slurred speech",
        "confusion",
        "loss of balance",
        "fainting",
        "syncope",
        "blackout",
        "tremor",
    ]
    if match_keywords(neuro_keywords, symptoms_lower, intake.raw_text):
        specialty = "Neurology"
        if "seizure" in symptoms_lower or (intake.severity and "severe" in intake.severity.lower()):
            priority = "Urgent"

    # Pediatrics Rules (Removed generic "kid"; "son" and "daughter" are matched using exact word boundaries)
    peds_keywords = [
        "child",
        "infant",
        "baby",
        "toddler",
        "pediatric",
        "newborn",
        "son",
        "daughter",
        "crying persistently",
        "teething",
        "diaper rash",
        "pediatric concern",
    ]
    if match_keywords(peds_keywords, symptoms_lower, intake.raw_text):
        specialty = "Pediatrics"

    # Dermatolgy Rules
    derm_keywords = [
        "rash",
        "skin",
        "itch",
        "acne",
        "hive",
        "eczema",
        "burn",
        "redness",
        "lesion",
        "pimple",
        "dry skin",
        "blister",
        "shingles",
        "mole",
        "warts",
        "skin concern",
    ]
    if match_keywords(derm_keywords, symptoms_lower, intake.raw_text):
        specialty = "Dermatology"

    # Orthopedics Rules (Removed overly broad standalone "back", "furniture", "heavy", "lift", keep exact clinical/action terms)
    ortho_keywords = [
        "bone",
        "joint",
        "fracture",
        "knee",
        "back pain",
        "muscle",
        "spasm",
        "strain",
        "sprain",
        "spine",
        "shoulder",
        "neck",
        "arthritis",
        "swelling",
        "dislocation",
        "ligament",
        "tendon",
        "cramp",
        "backache",
        "slipped disc",
        "sciatica",
        "lumbar",
        "heavy lifting",
        "moving furniture",
        "orthopedic concern",
        "muscle strain",
        "joint discomfort",
    ]
    if match_keywords(ortho_keywords, symptoms_lower, intake.raw_text):
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
        "practitioner_id": practitioner_id,
    }
