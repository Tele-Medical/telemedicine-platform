from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
import uuid

from app.models.pharmacy import (
    Prescription, PrescriptionItem, MedicineCatalog, Pharmacy, 
    StockBatch, StockMovement, Fulfillment, FulfillmentItem
)
from app.models.auth import User
from app.schemas.pharmacy import (
    PrescriptionCreate, StockIntakeRequest, StockAdjustmentRequest, 
    FulfillmentAcceptRequest, FulfillmentDispenseRequest
)

class PharmacyService:

    @staticmethod
    def create_prescription(db: Session, request: PrescriptionCreate, current_user: User) -> Prescription:
        # Create prescription
        rx = Prescription(
            patient_id=request.patient_id,
            encounter_id=request.encounter_id,
            notes=request.notes,
            created_by_user_id=current_user.id,
            status="pending"
        )
        db.add(rx)
        db.flush()

        # Add items
        for item in request.items:
            rx_item = PrescriptionItem(
                prescription_id=rx.id,
                medicine_id=item.medicine_id,
                dosage=item.dosage,
                duration_days=item.duration_days,
                quantity_prescribed=item.quantity_prescribed
            )
            db.add(rx_item)
            
        db.commit()
        db.refresh(rx)
        return rx

    @staticmethod
    def get_prescription(db: Session, prescription_id: uuid.UUID) -> Prescription:
        rx = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not rx:
            raise HTTPException(status_code=404, detail="Prescription not found")
        return rx

    @staticmethod
    def get_availability(db: Session, medicine_id: uuid.UUID):
        # Query total current_quantity across active batches for each pharmacy
        results = db.query(
            Pharmacy,
            func.sum(StockBatch.current_quantity).label("total_qty"),
            func.max(StockBatch.expiry_date).label("latest_expiry")
        ).join(StockBatch, StockBatch.pharmacy_id == Pharmacy.id)\
         .filter(StockBatch.medicine_id == medicine_id)\
         .filter(StockBatch.current_quantity > 0)\
         .group_by(Pharmacy.id).all()
         
        availability = []
        for pharmacy, total_qty, latest_expiry in results:
            availability.append({
                "pharmacy": pharmacy,
                "total_quantity": total_qty,
                "latest_expiry": latest_expiry
            })
        return availability

    @staticmethod
    def record_stock_intake(db: Session, request: StockIntakeRequest, current_user: User):
        # Create or update batch
        batch = db.query(StockBatch).filter(
            StockBatch.pharmacy_id == request.pharmacy_id,
            StockBatch.medicine_id == request.medicine_id,
            StockBatch.batch_number == request.batch_number
        ).first()

        if batch:
            batch.current_quantity += request.quantity_received
            batch.initial_quantity += request.quantity_received
        else:
            batch = StockBatch(
                pharmacy_id=request.pharmacy_id,
                medicine_id=request.medicine_id,
                batch_number=request.batch_number,
                expiry_date=request.expiry_date,
                initial_quantity=request.quantity_received,
                current_quantity=request.quantity_received
            )
            db.add(batch)
            
        db.flush()

        # Add movement
        movement = StockMovement(
            batch_id=batch.id,
            pharmacy_id=request.pharmacy_id,
            movement_type="intake",
            quantity_change=request.quantity_received,
            reason="intake",
            created_by_user_id=current_user.id
        )
        db.add(movement)
        db.commit()
        return batch

    @staticmethod
    def record_stock_adjustment(db: Session, request: StockAdjustmentRequest, current_user: User):
        batch = db.query(StockBatch).filter(StockBatch.id == request.batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        if batch.current_quantity + request.quantity_change < 0:
            raise HTTPException(status_code=400, detail="Adjustment results in negative quantity")

        batch.current_quantity += request.quantity_change
        
        movement = StockMovement(
            batch_id=batch.id,
            pharmacy_id=batch.pharmacy_id,
            movement_type="adjustment",
            quantity_change=request.quantity_change,
            reason=request.reason,
            notes=request.notes,
            created_by_user_id=current_user.id
        )
        db.add(movement)
        db.commit()
        return batch

    @staticmethod
    def accept_fulfillment(db: Session, prescription_id: uuid.UUID, request: FulfillmentAcceptRequest, current_user: User) -> Fulfillment:
        rx = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not rx:
            raise HTTPException(status_code=404, detail="Prescription not found")

        fulfillment = Fulfillment(
            prescription_id=rx.id,
            pharmacy_id=request.pharmacy_id,
            status="processing",
            created_by_user_id=current_user.id
        )
        db.add(fulfillment)
        
        rx.status = "processing"
        
        db.commit()
        db.refresh(fulfillment)
        return fulfillment

    @staticmethod
    def dispense_fulfillment(db: Session, fulfillment_id: uuid.UUID, request: FulfillmentDispenseRequest, current_user: User) -> Fulfillment:
        fulfillment = db.query(Fulfillment).filter(Fulfillment.id == fulfillment_id).first()
        if not fulfillment:
            raise HTTPException(status_code=404, detail="Fulfillment not found")

        rx = db.query(Prescription).filter(Prescription.id == fulfillment.prescription_id).first()

        for item in request.items:
            batch = db.query(StockBatch).filter(StockBatch.id == item.batch_id).first()
            if not batch:
                db.rollback()
                raise HTTPException(status_code=404, detail=f"Batch {item.batch_id} not found")

            if batch.current_quantity < item.quantity_dispensed:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Insufficient quantity in batch {item.batch_id}")

            # Record fulfillment item
            f_item = FulfillmentItem(
                fulfillment_id=fulfillment.id,
                prescription_item_id=item.prescription_item_id,
                batch_id=batch.id,
                quantity_dispensed=item.quantity_dispensed
            )
            db.add(f_item)

            # Update batch and add movement
            batch.current_quantity -= item.quantity_dispensed
            
            movement = StockMovement(
                batch_id=batch.id,
                pharmacy_id=fulfillment.pharmacy_id,
                movement_type="dispense",
                quantity_change=-item.quantity_dispensed,
                reason="prescription fulfillment",
                created_by_user_id=current_user.id
            )
            db.add(movement)

        fulfillment.status = "completed"
        rx.status = "completed"
        
        db.commit()
        db.refresh(fulfillment)
        return fulfillment
