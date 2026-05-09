import uuid
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

# Observation
class ObservationBase(BaseModel):
    patient_id: uuid.UUID
    encounter_id: Optional[uuid.UUID] = None
    code: str
    value_string: str
    unit: Optional[str] = None

class ObservationCreate(ObservationBase):
    pass

class ObservationResponse(ObservationBase):
    id: uuid.UUID
    created_by_user_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Allergy
class AllergyBase(BaseModel):
    patient_id: uuid.UUID
    substance: str
    criticality: Literal["low", "high", "unable_to_assess"]

class AllergyCreate(AllergyBase):
    pass

class AllergyUpdate(BaseModel):
    criticality: Literal["low", "high", "unable_to_assess"]
    base_version: int = Field(..., ge=1)

class AllergyResponse(AllergyBase):
    id: uuid.UUID
    record_version: int
    created_by_user_id: uuid.UUID
    updated_by_user_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Condition
class ConditionBase(BaseModel):
    patient_id: uuid.UUID
    encounter_id: Optional[uuid.UUID] = None
    clinical_status: Literal["active", "resolved", "inactive"]
    disease_code: Optional[str] = None
    disease_name: str

class ConditionCreate(ConditionBase):
    pass

class ConditionResponse(ConditionBase):
    id: uuid.UUID
    created_by_user_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# MedicationRequest
class MedicationRequestBase(BaseModel):
    patient_id: uuid.UUID
    encounter_id: Optional[uuid.UUID] = None
    medicine_catalog_id: uuid.UUID
    dosage_instruction: str
    duration_days: Optional[int] = Field(None, ge=1)
    status: Literal["active", "completed", "cancelled"] = "active"

class MedicationRequestCreate(MedicationRequestBase):
    pass

class MedicationRequestResponse(MedicationRequestBase):
    id: uuid.UUID
    record_version: int
    created_by_user_id: uuid.UUID
    updated_by_user_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
