import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey
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
