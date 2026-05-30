import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import pytest

from app.models.auth import User
from app.core.security import create_access_token

def get_auth_headers(db_session: Session, role: str = "doctor"):
    user = User(
        username=f"test_{role}_{uuid.uuid4().hex[:6]}",
        phone=f"+{uuid.uuid4().int % 10**10}",
        is_active=True,
        default_role=role,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}, user

def test_pharmacist_demand_aggregation(client: TestClient, db_session: Session):
    """
    Tests Phase 3: Pharmacist Demand Aggregation (The Macro View)
    Verifies that multiple pending prescriptions accurately sum up their required quantities.
    """
    headers, pharmacist = get_auth_headers(db_session, role="pharmacist")
    from app.models.patient import Patient
    from app.models.pharmacy import MedicineCatalog, Prescription, PrescriptionItem

    # 1. Setup Medicine
    medicine = MedicineCatalog(name="Dolo 650mg", type="tablet", code=f"DOLO650_{uuid.uuid4().hex[:6]}")
    db_session.add(medicine)
    db_session.flush()

    # 2. Setup Anonymous Patients
    patient1 = Patient(full_name="Demand Patient 1", record_version=1)
    patient2 = Patient(full_name="Demand Patient 2", record_version=1)
    db_session.add_all([patient1, patient2])
    db_session.flush()

    # 3. Create 2 Prescriptions with different quantities (10 and 20)
    rx1 = Prescription(patient_id=patient1.id, created_by_user_id=pharmacist.id, status="pending")
    rx2 = Prescription(patient_id=patient2.id, created_by_user_id=pharmacist.id, status="pending")
    db_session.add_all([rx1, rx2])
    db_session.flush()

    item1 = PrescriptionItem(prescription_id=rx1.id, medicine_id=medicine.id, dosage="1x", quantity_prescribed=10)
    item2 = PrescriptionItem(prescription_id=rx2.id, medicine_id=medicine.id, dosage="2x", quantity_prescribed=20)
    db_session.add_all([item1, item2])
    db_session.commit()

    # 4. Fetch the aggregated demand forecast
    response = client.get("/api/v1/pharmacy/demand-forecast", headers=headers)
    assert response.status_code == 200, "Should return 200 OK for demand forecast"
    data = response.json()
    
    # 5. Verify the aggregation math
    dolo_demand = next((item for item in data if item["medicine_id"] == str(medicine.id)), None)
    assert dolo_demand is not None, "Medicine should be listed in the demand forecast"
    assert dolo_demand["total_local_demand"] == 30, "Total demand should equal the sum of pending prescription quantities (10 + 20)"

def test_pharmacy_proximity_search(client: TestClient, db_session: Session):
    """
    Tests Phase 4: Patient Proximity Search (The 2KM Geo-Lookup)
    Verifies the Haversine formula correctly calculates distance and filters out-of-range pharmacies.
    """
    headers, patient_user = get_auth_headers(db_session, role="patient")
    from app.models.pharmacy import MedicineCatalog, Pharmacy, StockBatch

    # 1. Setup Medicine
    medicine = MedicineCatalog(name="Azithromycin 250mg", type="tablet", code=f"AZI250_{uuid.uuid4().hex[:6]}")
    db_session.add(medicine)
    db_session.flush()

    # 2. Create Pharmacies with Lat/Lng coordinates
    # Patient location will be queried at 12.9716, 77.5946
    
    # Pharmacy 1 is at 12.9720, 77.5950 (~60 meters away). Should be returned.
    pharmacy_close = Pharmacy(name="Close Pharmacy", latitude=12.9720, longitude=77.5950)
    
    # Pharmacy 2 is at 12.9300, 77.6000 (~4.6 KM away). Should NOT be returned in a 2KM search.
    pharmacy_far = Pharmacy(name="Far Pharmacy", latitude=12.9300, longitude=77.6000)
    
    db_session.add_all([pharmacy_close, pharmacy_far])
    db_session.flush()

    # 3. Add Stock to both pharmacies
    batch1 = StockBatch(
        pharmacy_id=pharmacy_close.id,
        medicine_id=medicine.id,
        batch_number="B1",
        expiry_date=datetime(2028, 1, 1).date(),
        initial_quantity=100,
        current_quantity=50, # In stock
    )
    batch2 = StockBatch(
        pharmacy_id=pharmacy_far.id,
        medicine_id=medicine.id,
        batch_number="B2",
        expiry_date=datetime(2028, 1, 1).date(),
        initial_quantity=100,
        current_quantity=100, # In stock
    )
    db_session.add_all([batch1, batch2])
    db_session.commit()

    # 4. Perform the geospatial search restricted to 2.0 KM
    response = client.get(
        f"/api/v1/medicines/{medicine.id}/nearby?lat=12.9716&lng=77.5946&radius=2.0",
        headers=headers
    )
    assert response.status_code == 200, "Should return 200 OK for proximity search"
    data = response.json()
    
    # 5. Verify only the nearby pharmacy is returned
    assert len(data) == 1, "Should only return pharmacies within the 2.0 KM radius"
    assert data[0]["name"] == "Close Pharmacy"
    assert "distance" in data[0], "Response should include calculated distance"
    assert data[0]["distance"] < 2.0, "Distance should be less than the requested radius"

def test_pharmacist_demand_excludes_completed_prescriptions(client: TestClient, db_session: Session):
    """
    Tests Phase 3 edge case: Once a prescription is fulfilled or cancelled,
    it should no longer contribute to the pharmacist's aggregated demand forecast.
    """
    headers, pharmacist = get_auth_headers(db_session, role="pharmacist")
    from app.models.patient import Patient
    from app.models.pharmacy import MedicineCatalog, Prescription, PrescriptionItem

    medicine = MedicineCatalog(name="Cetirizine 10mg", type="tablet", code=f"CET10_{uuid.uuid4().hex[:6]}")
    db_session.add(medicine)
    db_session.flush()

    patient = Patient(full_name="Demand Edge Case Patient", record_version=1)
    db_session.add(patient)
    db_session.flush()

    # Create 1 pending and 1 completed prescription
    rx_pending = Prescription(patient_id=patient.id, created_by_user_id=pharmacist.id, status="pending")
    rx_completed = Prescription(patient_id=patient.id, created_by_user_id=pharmacist.id, status="completed")
    db_session.add_all([rx_pending, rx_completed])
    db_session.flush()

    item1 = PrescriptionItem(prescription_id=rx_pending.id, medicine_id=medicine.id, dosage="1x", quantity_prescribed=10)
    item2 = PrescriptionItem(prescription_id=rx_completed.id, medicine_id=medicine.id, dosage="1x", quantity_prescribed=30)
    db_session.add_all([item1, item2])
    db_session.commit()

    response = client.get("/api/v1/pharmacy/demand-forecast", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    cet_demand = next((item for item in data if item["medicine_id"] == str(medicine.id)), None)
    assert cet_demand is not None
    assert cet_demand["total_local_demand"] == 10, "Should only aggregate pending prescriptions (10), completely ignoring the completed ones (30)"

def test_pharmacy_proximity_search_out_of_stock(client: TestClient, db_session: Session):
    """
    Tests Phase 4 edge case: If a pharmacy is within the 2KM radius but has 
    0 stock available for the requested medicine, it must NOT be returned in the results.
    """
    headers, patient_user = get_auth_headers(db_session, role="patient")
    from app.models.pharmacy import MedicineCatalog, Pharmacy, StockBatch

    medicine = MedicineCatalog(name="Amoxicillin 500mg", type="capsule", code=f"AMOX500_{uuid.uuid4().hex[:6]}")
    db_session.add(medicine)
    db_session.flush()

    # Pharmacy is extremely close (under 10 meters)
    pharmacy_out_of_stock = Pharmacy(name="Zero Stock Pharmacy", latitude=12.9716, longitude=77.5947)
    db_session.add(pharmacy_out_of_stock)
    db_session.flush()

    # But stock is 0
    batch = StockBatch(
        pharmacy_id=pharmacy_out_of_stock.id,
        medicine_id=medicine.id,
        batch_number="B-EMPTY",
        expiry_date=datetime(2028, 1, 1).date(),
        initial_quantity=100,
        current_quantity=0, # Completely Out of Stock
    )
    db_session.add(batch)
    db_session.commit()

    response = client.get(
        f"/api/v1/medicines/{medicine.id}/nearby?lat=12.9716&lng=77.5946&radius=2.0",
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 0, "Should return an empty list because the nearby pharmacy has 0 stock"
