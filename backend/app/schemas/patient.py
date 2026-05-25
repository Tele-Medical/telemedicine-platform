from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import date, datetime
from typing import Optional


class PatientBase(BaseModel):
    full_name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    preferred_language: str = "pa"
    date_of_birth: Optional[date] = None
    gender: str = "unknown"
    village: Optional[str] = None
    address_text: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PatientCreate(PatientBase):
    id: Optional[UUID] = None


class PatientUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1)
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    village: Optional[str] = None
    address_text: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PatientRead(PatientBase):
    id: UUID
    record_version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by_user_id: Optional[UUID] = None
    updated_by_user_id: Optional[UUID] = None
