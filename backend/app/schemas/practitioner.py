from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class PractitionerBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    specialty: Optional[str] = None
    registration_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, kw_only=True)

class PractitionerRead(PractitionerBase):
    id: UUID
    user_id: UUID
    record_version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by_user_id: Optional[UUID] = None
    updated_by_user_id: Optional[UUID] = None
