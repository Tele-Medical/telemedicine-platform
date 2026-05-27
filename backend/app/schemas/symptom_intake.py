from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class SymptomIntakeBase(BaseModel):
    raw_text: Optional[str] = None
    symptoms: Optional[List[str]] = None
    duration: Optional[str] = None
    severity: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SymptomIntakeCreate(SymptomIntakeBase):
    appointment_id: Optional[UUID] = None


class SymptomIntakeRead(SymptomIntakeBase):
    id: UUID
    appointment_id: UUID
    created_at: datetime
    updated_at: datetime
