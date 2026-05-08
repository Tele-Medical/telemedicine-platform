from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.auth import OTPRequest, OTPVerify, StaffLogin, TokenResponse, UserResponse
from app.services import auth_service
from app.models.auth import User

router = APIRouter()

@router.post("/request-otp")
def request_otp(payload: OTPRequest, db: Session = Depends(get_db)):
    return auth_service.request_otp(db, payload.phone)

@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(payload: OTPVerify, db: Session = Depends(get_db)):
    return auth_service.verify_otp(db, payload)

@router.post("/staff/login", response_model=TokenResponse)
def staff_login(payload: StaffLogin, db: Session = Depends(get_db)):
    return auth_service.authenticate_staff(db, payload)

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
