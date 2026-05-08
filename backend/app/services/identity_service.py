from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.patient import PatientIdentifier, Patient
from app.schemas.identity import IdentifierCreate
from uuid import UUID

def link_identifier(db: Session, patient_id: UUID, payload: IdentifierCreate) -> PatientIdentifier:
    # Ensure patient exists
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Check for duplicates across the system (e.g. same ABHA assigned to someone else)
    existing = db.query(PatientIdentifier).filter(
        PatientIdentifier.identifier_type == payload.identifier_type,
        PatientIdentifier.identifier_value == payload.identifier_value
    ).first()
    
    if existing:
        if existing.patient_id == patient_id:
            return existing # Already linked to this patient
        raise HTTPException(status_code=400, detail=f"This {payload.identifier_type} is already linked to another patient")
        
    # Create the link
    new_identifier = PatientIdentifier(
        patient_id=patient_id,
        identifier_type=payload.identifier_type,
        identifier_value=payload.identifier_value
    )
    db.add(new_identifier)
    db.commit()
    db.refresh(new_identifier)
    
    return new_identifier

def get_identifiers(db: Session, patient_id: UUID) -> list[PatientIdentifier]:
    return db.query(PatientIdentifier).filter(PatientIdentifier.patient_id == patient_id).all()
