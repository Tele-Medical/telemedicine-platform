import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, DateTime, ForeignKey, BigInteger, Date, CheckConstraint, Boolean, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class MedicineCatalog(Base):
    """
    Represents a type of medicine available in the system.
    Provides a standardized catalog for prescriptions and inventory.
    """
    __tablename__ = "medicine_catalog"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, index=True)
    type: Mapped[str] = mapped_column(String) # tablet, capsule, syrup, etc.
    code: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Pharmacy(Base):
    """
    Represents a physical or logical pharmacy location that holds inventory
    and fulfills prescriptions.
    """
    __tablename__ = "pharmacies"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    location_text: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Prescription(Base):
    """
    A medical prescription created by a practitioner for a patient.
    Can contain multiple medication items.
    """
    __tablename__ = "prescriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), index=True)
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("encounters.id"), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending") # pending, processing, completed, cancelled
    
    items: Mapped[list["PrescriptionItem"]] = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class PrescriptionItem(Base):
    """
    An individual medication item within a prescription.
    """
    __tablename__ = "prescription_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prescription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prescriptions.id"), index=True)
    medicine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicine_catalog.id"), index=True)
    
    dosage: Mapped[str] = mapped_column(String)
    duration_days: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    quantity_prescribed: Mapped[int] = mapped_column(BigInteger)
    
    prescription: Mapped["Prescription"] = relationship("Prescription", back_populates="items")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class StockBatch(Base):
    """
    Represents a specific batch of medication received by a pharmacy.
    Tracks expiration and current available quantity for that batch.
    """
    __tablename__ = "stock_batches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pharmacies.id"), index=True)
    medicine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("medicine_catalog.id"), index=True)
    
    batch_number: Mapped[str] = mapped_column(String, index=True)
    expiry_date: Mapped[date] = mapped_column(Date)
    
    initial_quantity: Mapped[int] = mapped_column(BigInteger)
    current_quantity: Mapped[int] = mapped_column(BigInteger)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("pharmacy_id", "medicine_id", "batch_number", name="uq_stock_batch"),
        CheckConstraint("initial_quantity > 0", name="stock_batch_initial_qty_check"),
        CheckConstraint("current_quantity >= 0", name="stock_batch_current_qty_check"),
    )

class StockMovement(Base):
    """
    An append-only ledger tracking all changes to a StockBatch.
    Used for auditing intakes, adjustments, and dispensations.
    """
    __tablename__ = "stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stock_batches.id"), index=True)
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pharmacies.id"), index=True)
    
    movement_type: Mapped[str] = mapped_column(String) # intake, adjustment, dispense
    quantity_change: Mapped[int] = mapped_column(BigInteger) # Can be positive or negative
    
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("movement_type IN ('intake', 'adjustment', 'dispense')", name="stock_movements_type_check"),
        CheckConstraint("quantity_change <> 0", name="stock_movements_qty_change_check"),
    )

class Fulfillment(Base):
    """
    Represents the process of a pharmacy fulfilling a prescription.
    """
    __tablename__ = "fulfillments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prescription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prescriptions.id"), index=True)
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pharmacies.id"), index=True)
    
    status: Mapped[str] = mapped_column(String, default="pending") # pending, processing, completed
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    items: Mapped[list["FulfillmentItem"]] = relationship("FulfillmentItem", back_populates="fulfillment", cascade="all, delete-orphan")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class FulfillmentItem(Base):
    """
    Maps a specific quantity of a StockBatch dispensed for a PrescriptionItem.
    """
    __tablename__ = "fulfillment_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fulfillment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fulfillments.id"), index=True)
    prescription_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prescription_items.id"))
    batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stock_batches.id"))
    
    quantity_dispensed: Mapped[int] = mapped_column(BigInteger)
    
    fulfillment: Mapped["Fulfillment"] = relationship("Fulfillment", back_populates="items")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
