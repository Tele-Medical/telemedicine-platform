import uuid
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

class EncounterBase(BaseModel):
    appointment_id: Optional[uuid.UUID] = None
    patient_id: uuid.UUID
    practitioner_id: Optional[uuid.UUID] = None
    encounter_mode: Literal["video", "audio", "async", "audio_fallback"]

class EncounterCreate(EncounterBase):
    pass

class EncounterSummary(BaseModel):
    clinical_summary: str
    outcome: Optional[str] = None

class EncounterResponse(EncounterBase):
    id: uuid.UUID
    status: str
    clinical_summary: Optional[str] = None
    outcome: Optional[str] = None
    record_version: int
    created_by_user_id: Optional[uuid.UUID] = None
    updated_by_user_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
