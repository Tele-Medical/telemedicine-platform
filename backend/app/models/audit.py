import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

class ProvenanceEvent(Base):
    __tablename__ = "provenance_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_entity_table: Mapped[str] = mapped_column(String, index=True)
    target_entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    
    actor_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    source_device_id: Mapped[str | None] = mapped_column(String, nullable=True)
    
    action: Mapped[str] = mapped_column(String) # create, update, soft_delete
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("action IN ('create', 'update', 'soft_delete')", name="provenance_events_action_check"),
    )

class Consent(Base):
    """
    Tracks patient consent for specific purposes (e.g., teleconsultation, research).
    Designed to be ABHA/ABDM ready.
    """
    __tablename__ = "consents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), index=True)
    granted_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    purpose: Mapped[str] = mapped_column(String) # teleconsultation, research, record_share
    scope: Mapped[str] = mapped_column(String, default="all")
    status: Mapped[str] = mapped_column(String, default="active") # active, revoked, expired
    
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("status IN ('active', 'revoked', 'expired')", name="consents_status_check"),
    )

class AuditEvent(Base):
    """
    Logs sensitive read access and system events.
    """
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_entity_type: Mapped[str] = mapped_column(String, index=True) # e.g., patients
    target_entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    
    actor_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String) # e.g., read, export
    
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String, nullable=True)
    
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
