from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
import uuid

from app.models.pharmacy import (
    Prescription,
    PrescriptionItem,
    MedicineCatalog,
    Pharmacy,
    StockBatch,
    StockMovement,
    Fulfillment,
    FulfillmentItem,
)
from app.models.patient import Patient
from app.models.auth import User
from app.schemas.pharmacy import (
    PrescriptionCreate,
    StockIntakeRequest,
    StockAdjustmentRequest,
    FulfillmentAcceptRequest,
    FulfillmentDispenseRequest,
)


class PharmacyService:
    """
    Service layer handling pharmacy and inventory business logic.
    Provides methods for prescription creation, inventory management, and fulfillment.
    """

    @staticmethod
    def create_prescription(
        db: Session, request: PrescriptionCreate, current_user: User
    ) -> Prescription:
        """
        Creates a new prescription with associated items.
        Validates patient existence and medicine catalog entries.
        """
        # Validate patient exists
        patient = db.get(Patient, request.patient_id)
        if not patient:
            raise HTTPException(status_code=400, detail="Patient not found")

        # Validate medicines exist
        medicine_ids = [item.medicine_id for item in request.items if item.medicine_id]
        if medicine_ids:
            found_medicines = (
                db.query(MedicineCatalog.id).filter(MedicineCatalog.id.in_(medicine_ids)).all()
            )
            found_ids = {m[0] for m in found_medicines}

            missing_ids = set(medicine_ids) - found_ids
            if missing_ids:
                raise HTTPException(
                    status_code=400, detail=f"Medicines not found in catalog: {missing_ids}"
                )

        # Validate that items without medicine_id at least have a medicine_name
        for item in request.items:
            if not item.medicine_id and not item.medicine_name:
                raise HTTPException(status_code=400, detail="Either medicine_id or medicine_name must be provided")

        # Create prescription
        rx = Prescription(
            patient_id=request.patient_id,
            encounter_id=request.encounter_id,
            notes=request.notes,
            created_by_user_id=current_user.id,
            status="pending",
        )
        db.add(rx)
        db.flush()

        # Add items
        for item in request.items:
            rx_item = PrescriptionItem(
                prescription_id=rx.id,
                medicine_id=item.medicine_id,
                medicine_name=item.medicine_name,
                dosage=item.dosage,
                duration_days=item.duration_days,
                quantity_prescribed=item.quantity_prescribed,
            )
            db.add(rx_item)

        db.commit()
        db.refresh(rx)
        return rx

    @staticmethod
    def get_prescription(db: Session, prescription_id: uuid.UUID) -> Prescription:
        """
        Retrieves a prescription by its ID.
        """
        rx = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not rx:
            raise HTTPException(status_code=404, detail="Prescription not found")
        return rx

    @staticmethod
    def get_prescriptions(db: Session, patient_id: uuid.UUID | None = None, current_user: User | None = None) -> list[Prescription]:
        query = db.query(Prescription)
        if patient_id:
            query = query.filter(Prescription.patient_id == patient_id)
        # If practitioner/patient specific logic is needed, add here
        return query.order_by(Prescription.created_at.desc()).all()

    @staticmethod
    def get_availability(db: Session, medicine_id: uuid.UUID):
        """
        Queries nearby pharmacies for available stock of a given medicine.
        Returns a list of pharmacies with total quantity and the latest expiry date.
        """
        # Query total current_quantity across active batches for each pharmacy
        results = (
            db.query(
                Pharmacy,
                func.sum(StockBatch.current_quantity).label("total_qty"),
                func.max(StockBatch.expiry_date).label("latest_expiry"),
            )
            .join(StockBatch, StockBatch.pharmacy_id == Pharmacy.id)
            .filter(StockBatch.medicine_id == medicine_id)
            .filter(StockBatch.current_quantity > 0)
            .group_by(Pharmacy.id)
            .all()
        )

        availability = []
        for pharmacy, total_qty, latest_expiry in results:
            availability.append(
                {"pharmacy": pharmacy, "total_quantity": total_qty, "latest_expiry": latest_expiry}
            )
        return availability

    @staticmethod
    def record_stock_intake(db: Session, request: StockIntakeRequest, current_user: User):
        """
        Records the intake of a new stock batch or adds to an existing batch.
        Updates the append-only StockMovement ledger. Handles concurrent inserts
        using a try-except block for IntegrityError.
        """
        if request.quantity_received <= 0:
            raise HTTPException(status_code=400, detail="Quantity received must be positive")

        try:
            db.begin_nested()
            batch = StockBatch(
                pharmacy_id=request.pharmacy_id,
                medicine_id=request.medicine_id,
                batch_number=request.batch_number,
                expiry_date=request.expiry_date,
                initial_quantity=request.quantity_received,
                current_quantity=request.quantity_received,
            )
            db.add(batch)
            db.flush()
            db.commit()
        except IntegrityError:
            db.rollback()
            existing_batch = (
                db.query(StockBatch)
                .with_for_update()
                .filter(
                    StockBatch.pharmacy_id == request.pharmacy_id,
                    StockBatch.medicine_id == request.medicine_id,
                    StockBatch.batch_number == request.batch_number,
                )
                .first()
            )

            if not existing_batch:
                raise HTTPException(
                    status_code=500, detail="Concurrency error while recording stock intake"
                )

            batch = existing_batch
            batch.current_quantity += request.quantity_received
            batch.initial_quantity += request.quantity_received
            db.flush()

        # Add movement
        movement = StockMovement(
            batch_id=batch.id,
            pharmacy_id=request.pharmacy_id,
            movement_type="intake",
            quantity_change=request.quantity_received,
            reason="intake",
            created_by_user_id=current_user.id,
        )
        db.add(movement)
        db.commit()
        return batch

    @staticmethod
    def record_stock_adjustment(db: Session, request: StockAdjustmentRequest, current_user: User):
        """
        Records manual adjustments (e.g. damages, expiry) to an existing stock batch.
        Ensures the resulting quantity is not negative and writes to the ledger.
        """
        if request.quantity_change == 0:
            raise HTTPException(status_code=400, detail="Quantity change cannot be zero")

        batch = (
            db.query(StockBatch).with_for_update().filter(StockBatch.id == request.batch_id).first()
        )
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
            created_by_user_id=current_user.id,
        )
        db.add(movement)
        db.commit()
        return batch

    @staticmethod
    def accept_fulfillment(
        db: Session,
        prescription_id: uuid.UUID,
        request: FulfillmentAcceptRequest,
        current_user: User,
    ) -> Fulfillment:
        """
        Accepts a prescription for fulfillment at a specific pharmacy.
        Validates pharmacy existence and prevents duplicate processing.
        """
        # Validate pharmacy exists
        pharmacy = db.get(Pharmacy, request.pharmacy_id)
        if not pharmacy:
            raise HTTPException(status_code=404, detail="Pharmacy not found")

        # Lock prescription to avoid race conditions when accepting
        rx = (
            db.query(Prescription)
            .with_for_update()
            .filter(Prescription.id == prescription_id)
            .first()
        )
        if not rx:
            raise HTTPException(status_code=404, detail="Prescription not found")

        if rx.status in ["processing", "completed"]:
            raise HTTPException(status_code=400, detail=f"Prescription is already {rx.status}")

        # Ensure no existing active fulfillment exists
        existing_fulfillment = (
            db.query(Fulfillment)
            .filter(
                Fulfillment.prescription_id == rx.id,
                Fulfillment.status.in_(["processing", "completed"]),
            )
            .first()
        )

        if existing_fulfillment:
            raise HTTPException(status_code=400, detail="Prescription is already being fulfilled")

        fulfillment = Fulfillment(
            prescription_id=rx.id,
            pharmacy_id=request.pharmacy_id,
            status="processing",
            created_by_user_id=current_user.id,
        )
        db.add(fulfillment)

        rx.status = "processing"

        db.commit()
        db.refresh(fulfillment)
        return fulfillment

    @staticmethod
    def dispense_fulfillment(
        db: Session,
        fulfillment_id: uuid.UUID,
        request: FulfillmentDispenseRequest,
        current_user: User,
    ) -> Fulfillment:
        """
        Dispenses medicines for a fulfillment.
        Verifies batch ownership, prescription items, medicine matching, quantity limits, and handles stock deductions safely.
        """
        fulfillment = (
            db.query(Fulfillment).with_for_update().filter(Fulfillment.id == fulfillment_id).first()
        )
        if not fulfillment:
            raise HTTPException(status_code=404, detail="Fulfillment not found")

        if fulfillment.status == "completed":
            raise HTTPException(status_code=400, detail="Fulfillment is already completed")

        rx = db.query(Prescription).filter(Prescription.id == fulfillment.prescription_id).first()
        if not rx:
            raise HTTPException(status_code=404, detail="Prescription not found")

        # Pre-load valid prescription items for validation
        valid_prescription_items = {item.id: item for item in rx.items}

        for item in request.items:
            # Validate ownership of prescription item
            if item.prescription_item_id not in valid_prescription_items:
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=f"Prescription item {item.prescription_item_id} does not belong to this prescription",
                )

            rx_item = valid_prescription_items[item.prescription_item_id]

            # Lock the batch and validate ownership
            batch = (
                db.query(StockBatch)
                .with_for_update()
                .filter(StockBatch.id == item.batch_id)
                .first()
            )
            if not batch:
                db.rollback()
                raise HTTPException(status_code=404, detail=f"Batch {item.batch_id} not found")

            if batch.pharmacy_id != fulfillment.pharmacy_id:
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=f"Batch {item.batch_id} does not belong to the fulfilling pharmacy",
                )

            # Verify the medicine matches
            if batch.medicine_id != rx_item.medicine_id:
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=f"Batch medicine {batch.medicine_id} does not match prescribed medicine {rx_item.medicine_id}",
                )

            # Verify that total dispensed quantity doesn't exceed prescribed quantity
            total_dispensed_so_far = (
                db.query(func.sum(FulfillmentItem.quantity_dispensed))
                .join(Fulfillment)
                .filter(
                    FulfillmentItem.prescription_item_id == rx_item.id,
                    Fulfillment.status.in_(["processing", "completed"]),
                )
                .scalar()
                or 0
            )

            if total_dispensed_so_far + item.quantity_dispensed > rx_item.quantity_prescribed:
                db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=f"Total dispensed quantity for item {rx_item.id} exceeds prescribed quantity",
                )

            if batch.current_quantity < item.quantity_dispensed:
                db.rollback()
                raise HTTPException(
                    status_code=400, detail=f"Insufficient quantity in batch {item.batch_id}"
                )

            # Record fulfillment item
            f_item = FulfillmentItem(
                fulfillment_id=fulfillment.id,
                prescription_item_id=item.prescription_item_id,
                batch_id=batch.id,
                quantity_dispensed=item.quantity_dispensed,
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
                created_by_user_id=current_user.id,
            )
            db.add(movement)

        fulfillment.status = "completed"
        rx.status = "completed"

        db.commit()
        db.refresh(fulfillment)
        return fulfillment
