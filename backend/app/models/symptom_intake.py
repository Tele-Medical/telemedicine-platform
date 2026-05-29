import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SymptomIntake(Base):
    __tablename__ = "symptom_intakes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("appointments.id")
    )

    # ML Extracted / Raw Data
    raw_text: Mapped[str | None] = mapped_column(String, nullable=True)
    symptoms: Mapped[list | None] = mapped_column(
        JSON, nullable=True
    )  # JSON array of extracted symptoms
    duration: Mapped[str | None] = mapped_column(String, nullable=True)
    severity: Mapped[str | None] = mapped_column(String, nullable=True)

    # Audit & Sync Standards
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
