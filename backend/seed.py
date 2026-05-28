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
        },
        { "id": uuid.uuid4(), "full_name": "Dr. Kavita Singh", "specialty_category": "Neurology", "specialty": "Brain Specialist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Rajesh Khanna", "specialty_category": "Cardiology", "specialty": "Interventional Cardiologist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Anjali Desai", "specialty_category": "Pediatrics", "specialty": "Neonatologist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Vikram Sethi", "specialty_category": "Orthopedics", "specialty": "Joint Replacement" },
        { "id": uuid.uuid4(), "full_name": "Dr. Meena Iyer", "specialty_category": "Dermatology", "specialty": "Skin Specialist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Sanjay Verma", "specialty_category": "General Medicine", "specialty": "Family Physician" },
        { "id": uuid.uuid4(), "full_name": "Dr. Priya Reddy", "specialty_category": "Neurology", "specialty": "Neurosurgeon" },
        { "id": uuid.uuid4(), "full_name": "Dr. Arjun Nair", "specialty_category": "Orthopedics", "specialty": "Sports Medicine" },
        { "id": uuid.uuid4(), "full_name": "Dr. Ritu Kapoor", "specialty_category": "Dermatology", "specialty": "Cosmetologist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Sameer Joshi", "specialty_category": "Cardiology", "specialty": "Electrophysiologist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Neha Sharma", "specialty_category": "Pediatrics", "specialty": "Pediatric Surgeon" },
        { "id": uuid.uuid4(), "full_name": "Dr. Rohan Das", "specialty_category": "General Medicine", "specialty": "Internal Medicine" },
        { "id": uuid.uuid4(), "full_name": "Dr. Sneha Patil", "specialty_category": "Neurology", "specialty": "Epilepsy Specialist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Manish Tiwari", "specialty_category": "Orthopedics", "specialty": "Spine Surgeon" },
        { "id": uuid.uuid4(), "full_name": "Dr. Pooja Agarwal", "specialty_category": "Dermatology", "specialty": "Pediatric Dermatologist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Vivek Chawla", "specialty_category": "Cardiology", "specialty": "Heart Failure Specialist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Aisha Khan", "specialty_category": "Pediatrics", "specialty": "Child Psychologist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Karan Bhatia", "specialty_category": "General Medicine", "specialty": "Geriatrician" },
        { "id": uuid.uuid4(), "full_name": "Dr. Shalini Menon", "specialty_category": "Neurology", "specialty": "Stroke Specialist" },
        { "id": uuid.uuid4(), "full_name": "Dr. Rahul Gupta", "specialty_category": "Orthopedics", "specialty": "Trauma Surgeon" },
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

    # Seeding completed
    print("\nCore Database seeding completed successfully!")

    print("\nDatabase seeding completed successfully!")
    session.close()


if __name__ == "__main__":
    seed_db()
