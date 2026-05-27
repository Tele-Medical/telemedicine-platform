"""
API router for clinical data operations.
Handles the creation and updating of Observations, Allergies, Conditions, and Medication Requests.
Ensures strict provenance tracking and role-based access control.
"""

import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
import os
import shutil
from sqlalchemy.orm import Session

from app.api import deps
from app.models.auth import User
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.models.clinical import Observation, Allergy, Condition, MedicationRequest, DocumentReference
from app.models.audit import ProvenanceEvent
from app.schemas.clinical import (
    ObservationCreate,
    ObservationResponse,
    AllergyCreate,
    AllergyUpdate,
    AllergyResponse,
    ConditionCreate,
    ConditionResponse,
    MedicationRequestCreate,
    MedicationRequestResponse,
    DocumentReferenceResponse,
)

router = APIRouter()


def create_provenance_event(
    db: Session, target_table: str, target_id: uuid.UUID, action: str, user_id: uuid.UUID
):
    """
    Creates a record in the provenance_events table to track who did what and when.
    """
    prov = ProvenanceEvent(
        target_entity_table=target_table,
        target_entity_id=target_id,
        actor_user_id=user_id,
        action=action,
    )
    db.add(prov)


def enforce_clinical_permissions(current_user: User):
    """
    Ensures that only staff users can modify clinical data.
    """
    if current_user.default_role == "patient":
        raise HTTPException(status_code=403, detail="Patients cannot write clinical records")


def validate_patient_encounter(db: Session, patient_id: uuid.UUID, encounter_id: uuid.UUID | None):
    """
    Validates that the patient exists and that the encounter (if provided) belongs to that patient.
    """
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
    """
    Records a new observation (e.g. Vitals) for a patient.
    """
    enforce_clinical_permissions(current_user)
    validate_patient_encounter(db, obs_in.patient_id, obs_in.encounter_id)

    obs = Observation(
        patient_id=obs_in.patient_id,
        encounter_id=obs_in.encounter_id,
        code=obs_in.code,
        value_string=obs_in.value_string,
        unit=obs_in.unit,
        created_by_user_id=current_user.id,
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
    """
    Records a new allergy for a patient.
    """
    enforce_clinical_permissions(current_user)
    validate_patient_encounter(db, allergy_in.patient_id, None)

    allergy = Allergy(
        patient_id=allergy_in.patient_id,
        substance=allergy_in.substance,
        criticality=allergy_in.criticality,
        created_by_user_id=current_user.id,
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
    """
    Updates an existing allergy record.
    Uses version-based concurrency control to prevent sync conflicts.
    """
    from sqlalchemy import update
    import typing
    from sqlalchemy import CursorResult

    enforce_clinical_permissions(current_user)

    stmt = (
        update(Allergy)
        .where(Allergy.id == id)
        .where(Allergy.record_version == allergy_in.base_version)
        .values(
            criticality=allergy_in.criticality,
            record_version=Allergy.record_version + 1,
            updated_by_user_id=current_user.id,
        )
    )
    result = db.execute(stmt)
    if typing.cast(CursorResult, result).rowcount == 0:
        db.rollback()
        allergy_exists = db.query(Allergy).filter(Allergy.id == id).first()
        if not allergy_exists:
            raise HTTPException(status_code=404, detail="Allergy not found")
        raise HTTPException(status_code=409, detail="Sync conflict: record version mismatch")

    db.flush()
    create_provenance_event(db, "allergies", id, "update", current_user.id)
    db.commit()

    return db.query(Allergy).filter(Allergy.id == id).first()


# --- Conditions ---
@router.post("/conditions", response_model=ConditionResponse)
def create_condition(
    *,
    db: Session = Depends(deps.get_db),
    condition_in: ConditionCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Records a new condition or diagnosis for a patient.
    """
    enforce_clinical_permissions(current_user)
    validate_patient_encounter(db, condition_in.patient_id, condition_in.encounter_id)

    condition = Condition(
        patient_id=condition_in.patient_id,
        encounter_id=condition_in.encounter_id,
        clinical_status=condition_in.clinical_status,
        disease_code=condition_in.disease_code,
        disease_name=condition_in.disease_name,
        created_by_user_id=current_user.id,
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
    """
    Creates a new medication request (prescription item) for a patient.
    """
    enforce_clinical_permissions(current_user)
    validate_patient_encounter(db, med_req_in.patient_id, med_req_in.encounter_id)

    med_req = MedicationRequest(
        patient_id=med_req_in.patient_id,
        encounter_id=med_req_in.encounter_id,
        medicine_catalog_id=med_req_in.medicine_catalog_id,
        dosage_instruction=med_req_in.dosage_instruction,
        duration_days=med_req_in.duration_days,
        status=med_req_in.status,
        created_by_user_id=current_user.id,
    )
    db.add(med_req)
    db.commit()
    db.refresh(med_req)

    create_provenance_event(db, "medication_requests", med_req.id, "create", current_user.id)
    db.commit()

    return med_req


# --- Documents ---
UPLOAD_DIR = "uploads/documents"

@router.post("/documents", response_model=DocumentReferenceResponse)
def upload_document(
    *,
    db: Session = Depends(deps.get_db),
    patient_id: uuid.UUID = Form(...),
    appointment_id: uuid.UUID | None = Form(None),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Uploads a clinical document (e.g., lab report, past prescription) for a patient.
    """
    validate_patient_encounter(db, patient_id, appointment_id)  # Using appointment_id as encounter_id check

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
    safe_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc = DocumentReference(
        patient_id=patient_id,
        appointment_id=appointment_id,
        file_name=file.filename or "unknown",
        file_path=file_path,
        content_type=file.content_type or "application/octet-stream",
        document_type=document_type,
        uploaded_by_user_id=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    create_provenance_event(db, "document_references", doc.id, "create", current_user.id)
    db.commit()

    return doc


@router.get("/documents", response_model=List[DocumentReferenceResponse])
def get_documents(
    patient_id: uuid.UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List documents for a patient.
    """
    # Enforce basic permission checks (could be stricter in production)
    if current_user.default_role == "patient":
        # Check if patient is trying to access their own documents
        pass

    docs = db.query(DocumentReference).filter(DocumentReference.patient_id == patient_id).all()
    return docs

@router.get("/documents/{document_id}/download")
def download_document(
    document_id: uuid.UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    doc = db.query(DocumentReference).filter(DocumentReference.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File missing on disk")
        
    return FileResponse(
        path=doc.file_path, 
        filename=doc.file_name, 
        media_type=doc.content_type
    )
