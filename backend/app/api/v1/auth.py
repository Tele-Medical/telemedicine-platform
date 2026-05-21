"""
API router for authentication and identity operations.
Supports OTP-based login for patients and password-based login for staff.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.auth import OTPRequest, OTPVerify, StaffLogin, TokenResponse, UserResponse
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
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Returns the profile of the currently authenticated user based on the JWT token.
    """
    return current_user
