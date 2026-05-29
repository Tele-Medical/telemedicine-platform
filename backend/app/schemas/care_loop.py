import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict


class CareLoopBase(BaseModel):
    patient_id: uuid.UUID
    practitioner_id: uuid.UUID
    chief_complaint: str


class CareLoopCreate(CareLoopBase):
    pass


class CareLoopResolve(BaseModel):
    resolution_notes: Optional[str] = None


class CareLoopResponse(CareLoopBase):
    id: uuid.UUID
    status: Literal["active", "completed", "cancelled"]
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
