import uuid
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict


class EncounterBase(BaseModel):
    """Base schema for an encounter."""

    appointment_id: Optional[uuid.UUID] = None
    patient_id: uuid.UUID
    practitioner_id: Optional[uuid.UUID] = None
    encounter_mode: Literal["video", "audio", "async", "audio_fallback"]


class EncounterCreate(EncounterBase):
    """Schema for creating a new encounter."""

    pass


class EncounterSummary(BaseModel):
    """Schema for submitting an encounter clinical summary."""

    clinical_summary: str
    outcome: Optional[Literal["completed", "referred", "follow_up"]] = None
    follow_up_date: Optional[datetime] = None
    resolution_notes: Optional[str] = None


class EncounterResponse(EncounterBase):
    """Schema for encounter responses."""

    id: uuid.UUID
    status: Literal["in_progress", "completed", "cancelled"]
    clinical_summary: Optional[str] = None
    outcome: Optional[Literal["completed", "referred", "follow_up"]] = None
    care_loop_id: Optional[uuid.UUID] = None
    record_version: int
    created_by_user_id: Optional[uuid.UUID] = None
    updated_by_user_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    practitioner_name: Optional[str] = None
    practitioner_role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
