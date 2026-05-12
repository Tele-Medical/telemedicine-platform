import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User
from app.core.security import create_access_token

def get_auth_headers(db_session: Session, role: str = "doctor"):
    user = User(
        username=f"test_{role}_{uuid.uuid4().hex[:6]}",
        phone=f"+{uuid.uuid4().int % 10**10}",
        is_active=True,
        default_role=role
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}, user

def test_create_prescription(client: TestClient, db_session: Session):
    headers, doctor = get_auth_headers(db_session, role="doctor")
    patient_id = uuid.uuid4()
    
    # 1. Setup Patient
    from app.models.patient import Patient
    patient = Patient(id=patient_id, full_name="Prescription Patient", record_version=1)
    db_session.add(patient)
    db_session.commit()
    
    # 2. Setup Medicine Catalog
    from app.models.pharmacy import MedicineCatalog
    medicine_id = uuid.uuid4()
    medicine = MedicineCatalog(id=medicine_id, name="Paracetamol 500mg", type="tablet", code="PARA500")
    db_session.add(medicine)
    db_session.commit()
    
    # 3. Create Prescription
    payload = {
        "patient_id": str(patient_id),
        "notes": "Take after meals",
        "items": [
            {
                "medicine_id": str(medicine_id),
                "dosage": "1 tablet twice a day",
                "duration_days": 5,
                "quantity_prescribed": 10
            }
        ]
    }
    
    response = client.post("/api/v1/prescriptions", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["patient_id"] == str(patient_id)
    assert len(data["items"]) == 1
    assert data["status"] == "pending"

def test_get_prescription(client: TestClient, db_session: Session):
    headers, doctor = get_auth_headers(db_session)
    # We assume test_create_prescription logic works to setup
    from app.models.patient import Patient
    from app.models.pharmacy import MedicineCatalog, Prescription, PrescriptionItem
    
    patient = Patient(full_name="Get Rx Patient", record_version=1)
    db_session.add(patient)
    medicine = MedicineCatalog(name="Amoxicillin 250mg", type="capsule", code="AMOX250")
    db_session.add(medicine)
    db_session.flush()
    
    rx = Prescription(patient_id=patient.id, created_by_user_id=doctor.id, notes="Test note")
    db_session.add(rx)
    db_session.flush()
    
    item = PrescriptionItem(prescription_id=rx.id, medicine_id=medicine.id, dosage="1x daily", duration_days=5, quantity_prescribed=5)
    db_session.add(item)
    db_session.commit()
    
    response = client.get(f"/api/v1/prescriptions/{rx.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == str(rx.id)
    assert len(response.json()["items"]) == 1

def test_inventory_stock_intake(client: TestClient, db_session: Session):
    headers, pharmacist = get_auth_headers(db_session, role="pharmacist")
    from app.models.pharmacy import MedicineCatalog, Pharmacy
    
    pharmacy = Pharmacy(name="Central Pharmacy", location_text="Nabha Center")
    db_session.add(pharmacy)
    medicine = MedicineCatalog(name="Ibuprofen 400mg", type="tablet", code="IBU400")
    db_session.add(medicine)
    db_session.commit()
    
    payload = {
        "pharmacy_id": str(pharmacy.id),
        "medicine_id": str(medicine.id),
        "batch_number": "BATCH-001",
        "expiry_date": "2028-12-31",
        "quantity_received": 500
    }
    
    response = client.post("/api/v1/inventory/stock-intake", json=payload, headers=headers)
    assert response.status_code == 201
    
    # Check ledger
    from app.models.pharmacy import StockMovement, StockBatch
    movements = db_session.query(StockMovement).filter_by(pharmacy_id=pharmacy.id, movement_type="intake").all()
    assert len(movements) == 1
    assert movements[0].quantity_change == 500
    
    batch = db_session.query(StockBatch).filter_by(batch_number="BATCH-001").first()
    assert batch.current_quantity == 500

def test_inventory_stock_adjustment(client: TestClient, db_session: Session):
    headers, pharmacist = get_auth_headers(db_session, role="pharmacist")
    from app.models.pharmacy import MedicineCatalog, Pharmacy, StockBatch, StockMovement
    
    pharmacy = Pharmacy(name="Central Pharmacy 2")
    db_session.add(pharmacy)
    medicine = MedicineCatalog(name="Cetirizine 10mg", type="tablet", code="CET10")
    db_session.add(medicine)
    db_session.flush()
    
    batch = StockBatch(pharmacy_id=pharmacy.id, medicine_id=medicine.id, batch_number="BATCH-002", expiry_date=datetime(2025, 1, 1).date(), initial_quantity=100, current_quantity=100)
    db_session.add(batch)
    db_session.commit()
    
    payload = {
        "batch_id": str(batch.id),
        "quantity_change": -10, # Lost/Damaged
        "reason": "damaged",
        "notes": "Water damage"
    }
    
    response = client.post("/api/v1/inventory/stock-adjustment", json=payload, headers=headers)
    assert response.status_code == 201
    
    db_session.refresh(batch)
    assert batch.current_quantity == 90
    
    movements = db_session.query(StockMovement).filter_by(batch_id=batch.id).all()
    assert len(movements) == 1
    assert movements[0].movement_type == "adjustment"
    assert movements[0].quantity_change == -10

def test_pharmacy_availability(client: TestClient, db_session: Session):
    headers, user = get_auth_headers(db_session, role="doctor")
    from app.models.pharmacy import MedicineCatalog, Pharmacy, StockBatch
    
    pharmacy = Pharmacy(name="Village Pharmacy")
    db_session.add(pharmacy)
    medicine = MedicineCatalog(name="Azithromycin 500mg", type="tablet", code="AZI500")
    db_session.add(medicine)
    db_session.flush()
    
    batch = StockBatch(pharmacy_id=pharmacy.id, medicine_id=medicine.id, batch_number="BATCH-003", expiry_date=datetime(2028, 1, 1).date(), initial_quantity=100, current_quantity=50)
    db_session.add(batch)
    db_session.commit()
    
    response = client.get(f"/api/v1/pharmacies/availability?medicine_id={medicine.id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["pharmacy"]["name"] == "Village Pharmacy"
    assert data[0]["total_quantity"] == 50

def test_fulfillment_workflow(client: TestClient, db_session: Session):
    headers, pharmacist = get_auth_headers(db_session, role="pharmacist")
    from app.models.patient import Patient
    from app.models.pharmacy import MedicineCatalog, Pharmacy, StockBatch, Prescription, PrescriptionItem
    
    patient = Patient(full_name="Fulfillment Patient", record_version=1)
    db_session.add(patient)
    pharmacy = Pharmacy(name="Fulfillment Pharmacy")
    db_session.add(pharmacy)
    medicine = MedicineCatalog(name="Metformin 500mg", type="tablet", code="MET500")
    db_session.add(medicine)
    db_session.flush()
    
    batch = StockBatch(pharmacy_id=pharmacy.id, medicine_id=medicine.id, batch_number="BATCH-004", expiry_date=datetime(2028, 1, 1).date(), initial_quantity=100, current_quantity=100)
    db_session.add(batch)
    
    rx = Prescription(patient_id=patient.id, created_by_user_id=pharmacist.id, status="pending")
    db_session.add(rx)
    db_session.flush()
    
    item = PrescriptionItem(prescription_id=rx.id, medicine_id=medicine.id, dosage="1x daily", quantity_prescribed=10)
    db_session.add(item)
    db_session.commit()
    
    # 1. Accept Fulfillment
    accept_payload = {
        "pharmacy_id": str(pharmacy.id)
    }
    response_accept = client.post(f"/api/v1/fulfillments/prescription/{rx.id}/accept", json=accept_payload, headers=headers)
    assert response_accept.status_code == 201
    fulfillment_id = response_accept.json()["id"]
    assert response_accept.json()["status"] == "processing"
    
    # 2. Dispense Fulfillment
    dispense_payload = {
        "items": [
            {
                "prescription_item_id": str(item.id),
                "batch_id": str(batch.id),
                "quantity_dispensed": 10
            }
        ]
    }
    response_dispense = client.post(f"/api/v1/fulfillments/{fulfillment_id}/dispense", json=dispense_payload, headers=headers)
    assert response_dispense.status_code == 200
    
    db_session.refresh(rx)
    assert rx.status == "completed"
    
    db_session.refresh(batch)
    assert batch.current_quantity == 90
    
    from app.models.pharmacy import StockMovement
    movements = db_session.query(StockMovement).filter_by(batch_id=batch.id).all()
    assert len(movements) == 1
    assert movements[0].movement_type == "dispense"
    assert movements[0].quantity_change == -10
