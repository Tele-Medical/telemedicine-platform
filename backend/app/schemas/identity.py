from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class IdentifierCreate(BaseModel):
    identifier_type: str
    identifier_value: str

class IdentifierResponse(BaseModel):
    id: UUID
    identifier_type: str
    identifier_value: str
    created_at: datetime
    
    class Config:
        from_attributes = True
