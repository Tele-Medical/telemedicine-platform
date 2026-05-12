from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Literal
import uuid

class ConsentCreate(BaseModel):
    purpose: str
    scope: str = "all"
    expires_at: Optional[datetime] = None

class ConsentUpdate(BaseModel):
    status: Literal["active", "revoked", "expired"]

class ConsentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    granted_by_user_id: uuid.UUID
    purpose: str
    scope: str
    status: str
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
