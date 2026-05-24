import uuid
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict


class AppointmentBase(BaseModel):
    """Base schema for an appointment."""

    patient_id: uuid.UUID
    practitioner_id: Optional[uuid.UUID] = None
    channel: Literal["telemedicine", "assisted"]
    scheduled_for: Optional[datetime] = None


class AppointmentCreate(AppointmentBase):
    """Schema for creating a new appointment."""

    pass


class AppointmentUpdate(BaseModel):
    """Schema for updating an existing appointment."""

    status: Literal["requested", "confirmed", "completed", "cancelled"]


class AppointmentResponse(AppointmentBase):
    """Schema for appointment responses."""

    id: uuid.UUID
    status: Literal["requested", "confirmed", "completed", "cancelled"]
    created_by_user_id: uuid.UUID
    updated_by_user_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
