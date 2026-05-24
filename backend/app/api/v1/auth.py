"""
API router for authentication and identity operations.
Supports OTP-based login for patients and password-based login for staff.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.auth import (
    OTPRequest,
    OTPVerify,
    StaffLogin,
    TokenResponse,
    UserResponse,
    UserUpdate,
)
from app.services import auth_service
from app.models.auth import User

router = APIRouter()


@router.post("/request-otp")
def request_otp(payload: OTPRequest, db: Session = Depends(get_db)):
    """
    Initiates the OTP login flow by sending a 6-digit code to the user's phone.
    """
    return auth_service.request_otp(db, payload.phone)


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(payload: OTPVerify, db: Session = Depends(get_db)):
    """
    Verifies the 6-digit OTP and returns an access token if successful.
    If the user does not exist, a new patient account is created automatically.
    """
    return auth_service.verify_otp(db, payload)


@router.post("/staff/login", response_model=TokenResponse)
def staff_login(payload: StaffLogin, db: Session = Depends(get_db)):
    """
    Standard password-based login for Doctors, ASHA workers, and Administrators.
    """
    return auth_service.authenticate_staff(db, payload)


@router.get("/me", response_model=UserResponse)
def read_users_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the profile of the currently authenticated user based on the JWT token.
    """
    patient_id = None
    practitioner_id = None

    if current_user.default_role == "patient":
        from app.models.patient import Patient
        patient = db.query(Patient).filter(Patient.created_by_user_id == current_user.id).first()
        if patient:
            patient_id = patient.id
    elif current_user.default_role in ["doctor", "practitioner"]:
        from app.models.practitioner import Practitioner
        practitioner = db.query(Practitioner).filter(Practitioner.user_id == current_user.id).first()
        if practitioner:
            practitioner_id = practitioner.id

    return {
        "id": current_user.id,
        "username": current_user.username,
        "phone": current_user.phone,
        "full_name": current_user.full_name,
        "default_role": current_user.default_role,
        "is_active": current_user.is_active,
        "patient_id": patient_id,
        "practitioner_id": practitioner_id,
    }


@router.patch("/me", response_model=UserResponse)
def update_users_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates the authenticated user's profile details.
    """
    return auth_service.update_me(db, current_user, payload)
