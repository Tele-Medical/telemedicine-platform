import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.auth import OTPChallenge, User
from app.core.security import get_password_hash

def test_request_otp_success(client: TestClient, db_session: Session):
    response = client.post("/api/v1/auth/request-otp", json={"phone": "+1234567890"})
    assert response.status_code == 200
    assert response.json() == {"message": "OTP sent successfully"}
    
    # Verify DB state
    challenge = db_session.query(OTPChallenge).filter_by(phone="+1234567890").first()
    assert challenge is not None
    assert challenge.attempts == 0

def test_verify_otp_success(client: TestClient, db_session: Session):
    # Setup OTP in DB first
    client.post("/api/v1/auth/request-otp", json={"phone": "+1234567890"})
    
    # Act
    response = client.post("/api/v1/auth/verify-otp", json={
        "phone": "+1234567890",
        "code": "123456" # Fixed mock code from service logic
    })
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    
    # Verify user was created
    user = db_session.query(User).filter_by(phone="+1234567890").first()
    assert user is not None

def test_verify_otp_invalid_code(client: TestClient, db_session: Session):
    client.post("/api/v1/auth/request-otp", json={"phone": "+1234567890"})
    
    response = client.post("/api/v1/auth/verify-otp", json={
        "phone": "+1234567890",
        "code": "000000"
    })
    
    assert response.status_code == 400
    assert "Invalid OTP" in response.json()["detail"]

def test_staff_login_success(client: TestClient, db_session: Session):
    # Setup a staff user
    hashed_pw = get_password_hash("secure_password")
    staff_user = User(username="admin", hashed_password=hashed_pw, is_active=True, default_role="admin")
    db_session.add(staff_user)
    db_session.commit()
    
    response = client.post("/api/v1/auth/staff/login", json={
        "username": "admin",
        "password": "secure_password"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_get_me_unauthenticated(client: TestClient):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401 # Missing bearer token header (HTTPBearer default)

def test_get_me_authenticated(client: TestClient, db_session: Session):
    # Register/verify to get a token
    client.post("/api/v1/auth/request-otp", json={"phone": "+1234567890"})
    login_response = client.post("/api/v1/auth/verify-otp", json={
        "phone": "+1234567890",
        "code": "123456"
    })
    token = login_response.json()["access_token"]
    
    # Fetch /me
    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert me_response.status_code == 200
    assert me_response.json()["phone"] == "+1234567890"