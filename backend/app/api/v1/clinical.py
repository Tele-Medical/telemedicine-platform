import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.auth import User
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.models.clinical import Observation, Allergy, Condition, MedicationRequest
from app.models.audit import ProvenanceEvent
from app.schemas.clinical import (
    ObservationCreate, ObservationResponse,
    AllergyCreate, AllergyUpdate, AllergyResponse,
    ConditionCreate, ConditionResponse,
    MedicationRequestCreate, MedicationRequestResponse
)

router = APIRouter()

def create_provenance_event(db: Session, target_table: str, target_id: uuid.UUID, action: str, user_id: uuid.UUID):
    prov = ProvenanceEvent(
        target_entity_table=target_table,
        target_entity_id=target_id,
        actor_user_id=user_id,
        action=action
    )
    db.add(prov)

def enforce_clinical_permissions(current_user: User):
    if current_user.default_role == "patient":
        raise HTTPException(status_code=403, detail="Patients cannot write clinical records")

def validate_patient_encounter(db: Session, patient_id: uuid.UUID, encounter_id: uuid.UUID | None):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    if encounter_id:
        enc = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not enc:
            raise HTTPException(status_code=404, detail="Encounter not found")
        if enc.patient_id != patient_id:
            raise HTTPException(status_code=400, detail="Encounter patient mismatch")

# --- Observations ---
@router.post("/observations", response_model=ObservationResponse)
def create_observation(
    *,
    db: Session = Depends(deps.get_db),
    obs_in: ObservationCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    enforce_clinical_permissions(current_user)
    validate_patient_encounter(db, obs_in.patient_id, obs_in.encounter_id)
    
    obs = Observation(
        patient_id=obs_in.patient_id,
        encounter_id=obs_in.encounter_id,
        code=obs_in.code,
        value_string=obs_in.value_string,
        unit=obs_in.unit,
        created_by_user_id=current_user.id
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    
    create_provenance_event(db, "observations", obs.id, "create", current_user.id)
    db.commit()
    
    return obs

# --- Allergies ---
@router.post("/allergies", response_model=AllergyResponse)
def create_allergy(
    *,
    db: Session = Depends(deps.get_db),
    allergy_in: AllergyCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    enforce_clinical_permissions(current_user)
    validate_patient_encounter(db, allergy_in.patient_id, None)
    
    allergy = Allergy(
        patient_id=allergy_in.patient_id,
        substance=allergy_in.substance,
        criticality=allergy_in.criticality,
        created_by_user_id=current_user.id
    )
    db.add(allergy)
    db.commit()
    db.refresh(allergy)
    
    create_provenance_event(db, "allergies", allergy.id, "create", current_user.id)
    db.commit()
    
    return allergy

@router.patch("/allergies/{id}", response_model=AllergyResponse)
def update_allergy(
    *,
    db: Session = Depends(deps.get_db),
    id: uuid.UUID,
    allergy_in: AllergyUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    enforce_clinical_permissions(current_user)
    
    allergy = db.query(Allergy).filter(Allergy.id == id).first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")
        
    if allergy_in.base_version != allergy.record_version:
        raise HTTPException(status_code=409, detail="Sync conflict: record version mismatch")
        
    allergy.criticality = allergy_in.criticality
    allergy.record_version += 1
    allergy.updated_by_user_id = current_user.id
    
    db.add(allergy)
    db.commit()
    db.refresh(allergy)
    
    create_provenance_event(db, "allergies", allergy.id, "update", current_user.id)
    db.commit()
    
    return allergy

# --- Conditions ---
@router.post("/conditions", response_model=ConditionResponse)
def create_condition(
    *,
    db: Session = Depends(deps.get_db),
    condition_in: ConditionCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    enforce_clinical_permissions(current_user)
    validate_patient_encounter(db, condition_in.patient_id, condition_in.encounter_id)
    
    condition = Condition(
        patient_id=condition_in.patient_id,
        encounter_id=condition_in.encounter_id,
        clinical_status=condition_in.clinical_status,
        disease_code=condition_in.disease_code,
        disease_name=condition_in.disease_name,
        created_by_user_id=current_user.id
    )
    db.add(condition)
    db.commit()
    db.refresh(condition)
    
    create_provenance_event(db, "conditions", condition.id, "create", current_user.id)
    db.commit()
    
    return condition

# --- Medication Requests ---
@router.post("/medication-requests", response_model=MedicationRequestResponse)
def create_medication_request(
    *,
    db: Session = Depends(deps.get_db),
    med_req_in: MedicationRequestCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    enforce_clinical_permissions(current_user)
    validate_patient_encounter(db, med_req_in.patient_id, med_req_in.encounter_id)
    
    med_req = MedicationRequest(
        patient_id=med_req_in.patient_id,
        encounter_id=med_req_in.encounter_id,
        medicine_catalog_id=med_req_in.medicine_catalog_id,
        dosage_instruction=med_req_in.dosage_instruction,
        duration_days=med_req_in.duration_days,
        status=med_req_in.status,
        created_by_user_id=current_user.id
    )
    db.add(med_req)
    db.commit()
    db.refresh(med_req)
    
    create_provenance_event(db, "medication_requests", med_req.id, "create", current_user.id)
    db.commit()
    
    return med_req
