import random
import uuid
from datetime import date, datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base
from app.core.security import get_password_hash
from app.models.auth import Role, User, UserRole
from app.models.patient import Patient, PatientIdentifier
from app.models.practitioner import Practitioner
from app.models.pharmacy import (
    MedicineCatalog,
    Pharmacy,
    StockBatch,
    StockMovement,
    Prescription,
    PrescriptionItem,
)
from app.models.appointment import Appointment


def seed_db():
    print("Connecting to database...")
    engine = create_engine(settings.database_url)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("Checking database schemas and applying tables if missing...")
    Base.metadata.create_all(bind=engine)

    # 1. Seed Roles
    print("Seeding Roles...")
    roles_data = {
        "admin": "System Administrator",
        "doctor": "Registered Medical Practitioner",
        "pharmacist": "Licensed Pharmacist",
        "asha_worker": "Accredited Social Health Activist",
        "patient": "Patient User",
    }

    db_roles = {}
    for role_name, description in roles_data.items():
        existing_role = session.query(Role).filter(Role.name == role_name).first()
        if not existing_role:
            role = Role(id=uuid.uuid4(), name=role_name, description=description)
            session.add(role)
            db_roles[role_name] = role
            print(f"Created Role: {role_name}")
        else:
            db_roles[role_name] = existing_role
            print(f"Role {role_name} already exists.")
    session.commit()

    # 2. Seed Users
    print("\nSeeding Core Users...")
    users_to_seed = [
        {
            "id": "e45a29b6-8a7e-4b92-9b2f-2d6c8b9d31f0",
            "username": "dr_sharma",
            "full_name": "Dr. Ramesh Sharma",
            "role": "doctor",
            "phone": "+919876543210",
        },
        {
            "id": "f82b31c9-7d6a-4c81-8c1e-3f5b7a8e22d1",
            "username": "asha_geeta",
            "full_name": "Geeta Devi",
            "role": "asha_worker",
            "phone": "+919876500001",
        },
        {
            "id": "c19d42f5-6e5b-4d73-9a0f-4e6c9b8a13e2",
            "username": "pharmacist_nabha",
            "full_name": "Nabha Central Pharmacist",
            "role": "pharmacist",
            "phone": "+919876500002",
        },
    ]

    hashed_pw = get_password_hash("password123")

    for u in users_to_seed:
        existing_user = session.query(User).filter(User.username == u["username"]).first()
        if not existing_user:
            user = User(
                id=uuid.UUID(u["id"]),
                username=u["username"],
                full_name=u["full_name"],
                phone=u["phone"],
                hashed_password=hashed_pw,
                default_role=u["role"],
                preferred_language="en",
                is_active=True,
            )
            session.add(user)
            session.flush()

            # Map user to role
            user_role = UserRole(id=uuid.uuid4(), user_id=user.id, role_id=db_roles[u["role"]].id)
            session.add(user_role)
            print(f"Created User: {u['username']} ({u['role']})")
        else:
            print(f"User {u['username']} already exists.")
    session.commit()

    # 3. Seed Practitioner Details
    print("\nSeeding Practitioner details...")
    doctor_user_id = uuid.UUID("e45a29b6-8a7e-4b92-9b2f-2d6c8b9d31f0")
    practitioners_data = [
        {
            "id": uuid.UUID("d24c53d6-5f4a-4e62-8b0d-3d5c8a7b99d1"),
            "full_name": "Dr. Ramesh Sharma",
            "specialty_category": "General Medicine",
            "specialty": "Internal Medicine",
        },
        {
            "id": uuid.uuid4(),
            "full_name": "Dr. Sunita Gupta",
            "specialty_category": "Cardiology",
            "specialty": "Heart Specialist",
        },
        {
            "id": uuid.uuid4(),
            "full_name": "Dr. Amit Patel",
            "specialty_category": "Pediatrics",
            "specialty": "Child Specialist",
        }
    ]

    for p_data in practitioners_data:
        existing = session.query(Practitioner).filter(Practitioner.full_name == p_data["full_name"]).first()
        if not existing:
            # Create dummy user for the additional doctors if it's not the main one
            doc_user_id = doctor_user_id if p_data["full_name"] == "Dr. Ramesh Sharma" else uuid.uuid4()
            if doc_user_id != doctor_user_id:
                new_doc_user = User(
                    id=doc_user_id,
                    phone=f"+91{random.randint(9000000000, 9999999999)}",
                    full_name=p_data["full_name"],
                    default_role="practitioner",
                    hashed_password=hashed_pw
                )
                session.add(new_doc_user)
                
            practitioner = Practitioner(
                id=p_data["id"],
                user_id=doc_user_id,
                full_name=p_data["full_name"],
                phone=f"+91{random.randint(9000000000, 9999999999)}",
                specialty_category=p_data["specialty_category"],
                specialty=p_data["specialty"],
                registration_number=f"MCI-{random.randint(100000, 999999)}",
            )
            session.add(practitioner)
            print(f"Created Practitioner: {p_data['full_name']}")
        else:
            print(f"Practitioner {p_data['full_name']} already exists.")
            
    session.commit()

    # 4. Seed Pharmacy
    print("\nSeeding Nabha Pharmacy...")
    pharmacy_id = uuid.UUID("a24c53d6-5f4a-4e62-8b0d-3d5c8a7b12e3")
    existing_pharmacy = session.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
    if not existing_pharmacy:
        pharmacy = Pharmacy(
            id=pharmacy_id,
            name="Nabha Central Pharmacy",
            location_text="Nabha Main Chowk, Punjab",
            is_active=True,
        )
        session.add(pharmacy)
        print("Created Pharmacy: Nabha Central Pharmacy")
    else:
        print("Pharmacy already exists.")
    session.commit()

    # 5. Seed Medicine Catalog
    print("\nSeeding Medicine Catalog...")
    medicines = [
        {"name": "Dolo 650mg (Paracetamol)", "type": "tablet", "code": "DOLO650"},
        {"name": "Novamox 500mg (Amoxicillin)", "type": "capsule", "code": "AMOX500"},
        {"name": "Zyrtec 10mg (Cetirizine)", "type": "tablet", "code": "ZYR10"},
        {"name": "Benadryl Cough Syrup (100ml)", "type": "syrup", "code": "BENA100"},
    ]

    db_medicines = {}
    for m in medicines:
        existing_med = (
            session.query(MedicineCatalog).filter(MedicineCatalog.code == m["code"]).first()
        )
        if not existing_med:
            med = MedicineCatalog(
                id=uuid.uuid5(uuid.NAMESPACE_DNS, m["code"]),
                name=m["name"],
                type=m["type"],
                code=m["code"],
                is_active=True,
            )
            session.add(med)
            db_medicines[m["code"]] = med
            print(f"Created Medicine: {m['name']}")
        else:
            db_medicines[m["code"]] = existing_med
            print(f"Medicine {m['name']} already exists.")
    session.commit()

    # 6. Seed Stock Batches & Inventory
    print("\nSeeding Inventory Stocks for Nabha Pharmacy...")
    stock_batches = [
        {"med_code": "DOLO650", "batch": "DOLO-B012", "qty": 500, "expiry": date(2028, 12, 31)},
        {"med_code": "AMOX500", "batch": "AMX-B225", "qty": 200, "expiry": date(2028, 6, 30)},
        {"med_code": "ZYR10", "batch": "ZYR-B990", "qty": 300, "expiry": date(2027, 8, 15)},
        {"med_code": "BENA100", "batch": "BEN-B404", "qty": 100, "expiry": date(2029, 1, 1)},
    ]

    for s in stock_batches:
        med = db_medicines[s["med_code"]]
        existing_batch = (
            session.query(StockBatch)
            .filter(
                StockBatch.pharmacy_id == pharmacy_id,
                StockBatch.medicine_id == med.id,
                StockBatch.batch_number == s["batch"],
            )
            .first()
        )

        if not existing_batch:
            batch = StockBatch(
                id=uuid.uuid4(),
                pharmacy_id=pharmacy_id,
                medicine_id=med.id,
                batch_number=s["batch"],
                expiry_date=s["expiry"],
                initial_quantity=s["qty"],
                current_quantity=s["qty"],
            )
            session.add(batch)
            session.flush()

            movement = StockMovement(
                id=uuid.uuid4(),
                batch_id=batch.id,
                pharmacy_id=pharmacy_id,
                movement_type="intake",
                quantity_change=s["qty"],
                notes="Initial demo seeding",
            )
            session.add(movement)
            print(f"Stocked batch {s['batch']} for {med.name} with quantity: {s['qty']}")
        else:
            print(f"Stock batch {s['batch']} already exists.")
    session.commit()

    # 7. Seed Demo Patients
    print("\nSeeding Patients & Extensible Identifiers...")
    patients_data = [
        {
            "full_name": "Ravi Kumar",
            "phone": "+919800000001",
            "gender": "male",
            "pref_lang": "hi",
            "village": "Nabha",
            "identifiers": [
                {"type": "abha", "val": "91-1234-5678-9012"},
                {"type": "local_clinic_id", "val": "NAB-2026-001"},
            ],
        },
        {
            "full_name": "Kaur Kaur",
            "phone": None,
            "gender": "female",
            "pref_lang": "pa",
            "village": "Nabha",
            "identifiers": [{"type": "local_clinic_id", "val": "NAB-2026-ASHA-05"}],
        },
    ]

    for p in patients_data:
        patient_id = uuid.uuid5(uuid.NAMESPACE_DNS, p["full_name"])
        existing_patient = session.query(Patient).filter(Patient.id == patient_id).first()
        if not existing_patient and p["phone"]:
            existing_patient = session.query(Patient).filter(Patient.phone == p["phone"]).first()

        if not existing_patient:
            patient = Patient(
                id=patient_id,
                full_name=p["full_name"],
                phone=p["phone"],
                preferred_language=p["pref_lang"],
                gender=p["gender"],
                village=p["village"],
                record_version=1,
                is_active=True,
            )
            session.add(patient)
            session.flush()

            for ident in p["identifiers"]:
                identifier = PatientIdentifier(
                    id=uuid.uuid4(),
                    patient_id=patient.id,
                    identifier_type=ident["type"],
                    identifier_value=ident["val"],
                    record_version=1,
                    is_active=True,
                )
                session.add(identifier)
            print(f"Created Patient: {p['full_name']}")
        else:
            print(f"Patient {p['full_name']} already exists.")
    session.commit()

    # 8. Seed Appointments
    print("\nSeeding Demo Appointments...")
    ravi = session.query(Patient).filter(Patient.full_name == "Ravi Kumar").first()
    if ravi:
        ravi_id = ravi.id
        asha_user = session.query(User).filter(User.username == "asha_geeta").first()
        asha_user_id = (
            asha_user.id if asha_user else uuid.UUID("f82b31c9-7d6a-4c81-8c1e-3f5b7a8e22d1")
        )

        doctor = session.query(Practitioner).filter(Practitioner.full_name == "Dr. Ramesh Sharma").first()
        if doctor:
            practitioner_id = doctor.id
        else:
            practitioner_id = uuid.UUID("d24c53d6-5f4a-4e62-8b0d-3d5c8a7b99d1")

        existing_appt = (
            session.query(Appointment)
            .filter(
                Appointment.patient_id == ravi_id, Appointment.practitioner_id == practitioner_id
            )
            .first()
        )

        if not existing_appt:
            appt = Appointment(
                id=uuid.uuid4(),
                patient_id=ravi_id,
                practitioner_id=practitioner_id,
                status="confirmed",
                channel="assisted",
                scheduled_for=datetime.now(timezone.utc),
                created_by_user_id=asha_user_id,
            )
            session.add(appt)
            print("Created appointment for Ravi Kumar with Dr. Sharma")
        else:
            print("Appointment for Ravi Kumar already exists.")
    session.commit()

    # 9. Seed Prescriptions
    print("\nSeeding Demo Prescriptions...")
    if ravi:
        existing_prescription = (
            session.query(Prescription).filter(Prescription.patient_id == ravi.id).first()
        )
        if not existing_prescription:
            prescription = Prescription(
                id=uuid.uuid4(),
                patient_id=ravi.id,
                encounter_id=None,
                notes="Demo prescription",
                created_by_user_id=doctor_user_id,
            )
            session.add(prescription)
            session.flush()

            dolo = session.query(MedicineCatalog).filter(MedicineCatalog.code == "DOLO650").first()
            if dolo:
                item = PrescriptionItem(
                    id=uuid.uuid4(),
                    prescription_id=prescription.id,
                    medicine_id=dolo.id,
                    dosage="1-0-1 after food",
                    duration_days=5,
                    quantity_prescribed=10,
                )
                session.add(item)
                print("Created prescription for Ravi Kumar with Dolo 650mg")
        else:
            print("Prescription for Ravi Kumar already exists.")
    session.commit()

    print("\nDatabase seeding completed successfully!")
    session.close()


if __name__ == "__main__":
    seed_db()
