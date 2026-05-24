import uuid
from datetime import datetime, timezone
from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(
        String, nullable=True
    )  # Guardian phone if child/elderly
    preferred_language: Mapped[str] = mapped_column(String, default="pa")
    date_of_birth: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str] = mapped_column(String, default="unknown")
    village: Mapped[str | None] = mapped_column(String, nullable=True)
    address_text: Mapped[str | None] = mapped_column(String, nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String, nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String, nullable=True)

    # Extensible Identity (This makes us ABHA-ready!)
    identifiers: Mapped[list["PatientIdentifier"]] = relationship(
        "PatientIdentifier", back_populates="patient"
    )

    # Audit & Sync Standards
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    record_version: Mapped[int] = mapped_column(BigInteger, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class PatientIdentifier(Base):
    """Stores ABHA IDs, Local IDs, or external system mappings without polluting the main Patient table."""

    __tablename__ = "patient_identifiers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"))
    identifier_type: Mapped[str] = mapped_column(String)  # e.g., 'abha', 'local_clinic_id'
    identifier_value: Mapped[str] = mapped_column(String)
    patient: Mapped["Patient"] = relationship("Patient", back_populates="identifiers")

    # Audit & Sync Standards
    record_version: Mapped[int] = mapped_column(BigInteger, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
