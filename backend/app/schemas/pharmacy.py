from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, date
import uuid

class PrescriptionItemCreate(BaseModel):
    medicine_id: uuid.UUID
    dosage: str
    duration_days: Optional[int] = None
    quantity_prescribed: int

class PrescriptionCreate(BaseModel):
    patient_id: uuid.UUID
    encounter_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    items: List[PrescriptionItemCreate]

class PrescriptionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    medicine_id: uuid.UUID
    dosage: str
    duration_days: Optional[int]
    quantity_prescribed: int

class PrescriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    encounter_id: Optional[uuid.UUID]
    created_by_user_id: uuid.UUID
    notes: Optional[str]
    status: str
    items: List[PrescriptionItemResponse]
    created_at: datetime

class PharmacyBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    location_text: Optional[str] = None

class PharmacyAvailabilityResponse(BaseModel):
    pharmacy: PharmacyBase
    total_quantity: int
    latest_expiry: Optional[date]

class StockIntakeRequest(BaseModel):
    pharmacy_id: uuid.UUID
    medicine_id: uuid.UUID
    batch_number: str
    expiry_date: date
    quantity_received: int

class StockAdjustmentRequest(BaseModel):
    batch_id: uuid.UUID
    quantity_change: int
    reason: Optional[str] = None
    notes: Optional[str] = None

class FulfillmentAcceptRequest(BaseModel):
    pharmacy_id: uuid.UUID

class FulfillmentDispenseItem(BaseModel):
    prescription_item_id: uuid.UUID
    batch_id: uuid.UUID
    quantity_dispensed: int

class FulfillmentDispenseRequest(BaseModel):
    items: List[FulfillmentDispenseItem]

class FulfillmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    prescription_id: uuid.UUID
    pharmacy_id: uuid.UUID
    status: str
