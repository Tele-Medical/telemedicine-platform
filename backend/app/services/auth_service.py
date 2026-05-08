from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.auth import User, OTPChallenge, Session as DBSession
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.schemas.auth import OTPVerify, StaffLogin, TokenResponse
from datetime import datetime, timedelta, timezone
import secrets
import hashlib

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def request_otp(db: Session, phone: str) -> dict:
    # 1. Generate fake OTP for now (would use SMS provider here)
    otp_code = str(secrets.randbelow(900000) + 100000)
    if phone == "+1234567890": # Test account
        otp_code = "123456"
    
    # 2. Hash the OTP (we never store plain text OTPs)
    otp_hash = get_password_hash(otp_code)
    
    # 3. Create the challenge
    expires = datetime.now(timezone.utc) + timedelta(minutes=5)
    challenge = OTPChallenge(
        phone=phone,
        otp_hash=otp_hash,
        expires_at=expires
    )
    db.add(challenge)
    db.commit()
    
    return {"message": "OTP sent successfully"}

def verify_otp(db: Session, payload: OTPVerify) -> TokenResponse:
    # 1. Find the latest pending challenge for this phone
    challenge = db.query(OTPChallenge).filter(
        OTPChallenge.phone == payload.phone,
        OTPChallenge.status == "pending",
        OTPChallenge.expires_at > datetime.now(timezone.utc)
    ).order_by(OTPChallenge.created_at.desc()).first()
    
    if not challenge:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    # 2. Verify the code
    if not verify_password(payload.code, challenge.otp_hash):
        challenge.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    # 3. Mark challenge as verified
    challenge.status = "verified"
    challenge.verified_at = datetime.now(timezone.utc)
    
    # 4. Find or Create User
    user = db.query(User).filter(User.phone == payload.phone).first()
    if not user:
        user = User(phone=payload.phone, default_role="patient")
        db.add(user)
        db.commit()
        db.refresh(user)
        
    challenge.user_id = user.id
    
    # 5. Create Session
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    refresh_hash = hash_token(refresh_token)
    
    db_session = DBSession(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(db_session)
    db.commit()
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

def authenticate_staff(db: Session, payload: StaffLogin) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    refresh_hash = hash_token(refresh_token)
    
    db_session = DBSession(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(db_session)
    db.commit()
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
