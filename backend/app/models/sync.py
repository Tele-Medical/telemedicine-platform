import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, BigInteger, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

class SyncCursor(Base):
    """Tracks the last successful synchronization point per user/device."""
    __tablename__ = "sync_cursors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("device_registrations.id"), index=True)
    
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    cursor_token: Mapped[str] = mapped_column(String, index=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("user_id", "device_id", name="uq_sync_cursor_user_device"),
    )

class SyncConflict(Base):
    """Stores records that failed sync due to version mismatches for manual resolution."""
    __tablename__ = "sync_conflicts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String, index=True) # e.g., 'allergy', 'medication_request'
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    
    base_version: Mapped[int] = mapped_column(BigInteger)
    server_version: Mapped[int] = mapped_column(BigInteger)
    
    client_payload: Mapped[dict] = mapped_column(JSONB)
    server_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    conflict_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_strategy: Mapped[str | None] = mapped_column(String, nullable=True) # client_wins, server_wins, manual_merge
    resolved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
