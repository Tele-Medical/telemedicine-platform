from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.api.deps import get_db, get_current_user
from app.models.auth import User
from app.schemas.pharmacy import (
    PrescriptionCreate,
    PrescriptionResponse,
    PharmacyAvailabilityResponse,
    StockIntakeRequest,
    StockAdjustmentRequest,
    FulfillmentAcceptRequest,
    FulfillmentDispenseRequest,
    FulfillmentResponse,
)
from app.services.pharmacy_service import PharmacyService

router = APIRouter()


@router.post(
    "/prescriptions", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED
)
def create_prescription(
    request: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PharmacyService.create_prescription(db, request, current_user)


@router.get("/prescriptions/{prescription_id}", response_model=PrescriptionResponse)
def get_prescription(
    prescription_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PharmacyService.get_prescription(db, prescription_id)


@router.get("/pharmacies/availability", response_model=List[PharmacyAvailabilityResponse])
def get_pharmacy_availability(
    medicine_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PharmacyService.get_availability(db, medicine_id)


@router.post("/inventory/stock-intake", status_code=status.HTTP_201_CREATED)
def record_stock_intake(
    request: StockIntakeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # In a real app, verify user is pharmacist
    if current_user.default_role not in ["admin", "pharmacist"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    PharmacyService.record_stock_intake(db, request, current_user)
    return {"status": "success"}


@router.post("/inventory/stock-adjustment", status_code=status.HTTP_201_CREATED)
def record_stock_adjustment(
    request: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.default_role not in ["admin", "pharmacist"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    PharmacyService.record_stock_adjustment(db, request, current_user)
    return {"status": "success"}


@router.post(
    "/fulfillments/prescription/{prescription_id}/accept",
    response_model=FulfillmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def accept_fulfillment(
    prescription_id: uuid.UUID,
    request: FulfillmentAcceptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.default_role not in ["admin", "pharmacist"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return PharmacyService.accept_fulfillment(db, prescription_id, request, current_user)


@router.post("/fulfillments/{fulfillment_id}/dispense", response_model=FulfillmentResponse)
def dispense_fulfillment(
    fulfillment_id: uuid.UUID,
    request: FulfillmentDispenseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.default_role not in ["admin", "pharmacist"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return PharmacyService.dispense_fulfillment(db, fulfillment_id, request, current_user)


@router.get("/fulfillments/prescriptions")
def list_pending_fulfillments(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    List prescriptions that need fulfillment.
    Joins with Patient and MedicineCatalog for a rich response.
    """
    if current_user.default_role not in ["admin", "pharmacist"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models.pharmacy import Prescription, PrescriptionItem, MedicineCatalog
    from app.models.patient import Patient

    results = (
        db.query(Prescription, Patient.full_name)
        .join(Patient, Prescription.patient_id == Patient.id)
        .all()
    )

    response = []
    for prescription, patient_name in results:
        items = (
            db.query(MedicineCatalog.name)
            .join(PrescriptionItem, PrescriptionItem.medicine_catalog_id == MedicineCatalog.id)
            .filter(PrescriptionItem.prescription_id == prescription.id)
            .all()
        )
        response.append(
            {
                "id": str(prescription.id),
                "patientName": patient_name,
                "status": "pending",  # Simplified for demo
                "medications": [item[0] for item in items],
            }
        )

    return response
