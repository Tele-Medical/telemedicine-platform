from sqlalchemy.orm import Session
from fastapi import HTTPException, Request
import uuid
from typing import List

from app.models.audit import Consent, AuditEvent
from app.models.patient import Patient
from app.models.auth import User
from app.schemas.audit import ConsentCreate, ConsentUpdate

class AuditService:
    @staticmethod
    def log_access(db: Session, target_entity_type: str, target_entity_id: uuid.UUID, actor_user_id: uuid.UUID, action: str, request: Request = None):
        """
        Logs a read or export action for sensitive entities.
        """
        ip_address = request.client.host if request and request.client else None
        user_agent = request.headers.get("user-agent") if request else None

        audit_event = AuditEvent(
            target_entity_type=target_entity_type,
            target_entity_id=target_entity_id,
            actor_user_id=actor_user_id,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_event)
        db.commit()

class ConsentService:
    @staticmethod
    def create_consent(db: Session, patient_id: uuid.UUID, request: ConsentCreate, current_user: User) -> Consent:
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        consent = Consent(
            patient_id=patient_id,
            granted_by_user_id=current_user.id,
            purpose=request.purpose,
            scope=request.scope,
            expires_at=request.expires_at,
            status="active"
        )
        db.add(consent)
        db.commit()
        db.refresh(consent)
        return consent

    @staticmethod
    def update_consent(db: Session, patient_id: uuid.UUID, consent_id: uuid.UUID, request: ConsentUpdate, current_user: User) -> Consent:
        consent = db.query(Consent).filter(Consent.id == consent_id, Consent.patient_id == patient_id).first()
        if not consent:
            raise HTTPException(status_code=404, detail="Consent not found")

        consent.status = request.status
        db.commit()
        db.refresh(consent)
        return consent

    @staticmethod
    def get_patient_consents(db: Session, patient_id: uuid.UUID) -> List[Consent]:
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
            
        return db.query(Consent).filter(Consent.patient_id == patient_id).all()
