from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime


class IdentifierCreate(BaseModel):
    identifier_type: str = Field(..., min_length=1)
    identifier_value: str = Field(..., min_length=1)


class IdentifierResponse(BaseModel):
    id: UUID
    identifier_type: str
    identifier_value: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
