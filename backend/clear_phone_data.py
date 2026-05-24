import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.auth import User, UserRole, Session, DeviceRegistration, OTPChallenge
from app.models.patient import Patient, PatientIdentifier
from app.models.appointment import Appointment
from app.models.encounter import Encounter
from app.models.clinical import Observation, MedicationRequest


def clear_phone_data():
    phone_variants = ["9821709422", "+919821709422"]

    print("Connecting to database...")
    engine = create_engine(settings.database_url)
    SessionClass = sessionmaker(bind=engine)
    session = SessionClass()

    try:
        # 1. Clear Patient records and all cascading clinical records
        for phone in phone_variants:
            patients = session.query(Patient).filter(Patient.phone == phone).all()
            for patient in patients:
                print(f"Found Patient: {patient.full_name} ({patient.phone})")
                patient_id = patient.id

                # Delete observations
                obs_deleted = (
                    session.query(Observation)
                    .filter(Observation.patient_id == patient_id)
                    .delete(synchronize_session=False)
                )
                print(f"  Deleted {obs_deleted} Observations")

                # Delete medication requests
                med_req_deleted = (
                    session.query(MedicationRequest)
                    .filter(MedicationRequest.patient_id == patient_id)
                    .delete(synchronize_session=False)
                )
                print(f"  Deleted {med_req_deleted} MedicationRequests")

                # Delete encounters
                enc_deleted = (
                    session.query(Encounter)
                    .filter(Encounter.patient_id == patient_id)
                    .delete(synchronize_session=False)
                )
                print(f"  Deleted {enc_deleted} Encounters")

                # Delete appointments
                app_deleted = (
                    session.query(Appointment)
                    .filter(Appointment.patient_id == patient_id)
                    .delete(synchronize_session=False)
                )
                print(f"  Deleted {app_deleted} Appointments")

                # Delete patient identifiers
                ident_deleted = (
                    session.query(PatientIdentifier)
                    .filter(PatientIdentifier.patient_id == patient_id)
                    .delete(synchronize_session=False)
                )
                print(f"  Deleted {ident_deleted} PatientIdentifiers")

                # Delete patient
                session.delete(patient)
                print(f"  Deleted Patient record: {patient_id}")

            # 2. Clear User records and all active sessions/OTPs
            users = session.query(User).filter(User.phone == phone).all()
            for user in users:
                print(f"Found User: {user.username} ({user.phone})")
                user_id = user.id

                # Delete sessions
                sess_deleted = (
                    session.query(Session)
                    .filter(Session.user_id == user_id)
                    .delete(synchronize_session=False)
                )
                print(f"  Deleted {sess_deleted} Sessions")

                # Delete device registrations
                dev_deleted = (
                    session.query(DeviceRegistration)
                    .filter(DeviceRegistration.user_id == user_id)
                    .delete(synchronize_session=False)
                )
                print(f"  Deleted {dev_deleted} DeviceRegistrations")

                # Delete OTP challenges
                otp_deleted = (
                    session.query(OTPChallenge)
                    .filter(OTPChallenge.user_id == user_id)
                    .delete(synchronize_session=False)
                )
                print(f"  Deleted {otp_deleted} OTPChallenges")

                # Delete user roles mapping
                roles_deleted = (
                    session.query(UserRole)
                    .filter(UserRole.user_id == user_id)
                    .delete(synchronize_session=False)
                )
                print(f"  Deleted {roles_deleted} UserRole mappings")

                # Delete user
                session.delete(user)
                print(f"  Deleted User record: {user_id}")

            # Delete any OTP challenge specifically matching the phone string (even if user_id is null)
            otp_specific_deleted = (
                session.query(OTPChallenge)
                .filter(OTPChallenge.phone == phone)
                .delete(synchronize_session=False)
            )
            if otp_specific_deleted > 0:
                print(f"Deleted {otp_specific_deleted} orphaned OTP challenges for phone {phone}")

        session.commit()
        print("\nDatabase cleanup for phone number variants completed successfully.")
    except Exception as e:
        session.rollback()
        print(f"Error during database cleanup: {e}", file=sys.stderr)
    finally:
        session.close()


if __name__ == "__main__":
    clear_phone_data()
