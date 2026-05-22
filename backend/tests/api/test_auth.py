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


# ---------------------------------------------------------------------------
# Additional edge cases – OTP flow
# ---------------------------------------------------------------------------

def test_verify_otp_no_otp_requested(client: TestClient, db_session: Session):
    """Calling verify-otp without first requesting OTP should return 400."""
    response = client.post("/api/v1/auth/verify-otp", json={
        "phone": "+9876543210",
        "code": "123456"
    })
    assert response.status_code == 400
    assert "Invalid or expired OTP" in response.json()["detail"]


def test_verify_otp_attempts_incremented_on_wrong_code(client: TestClient, db_session: Session):
    client.post("/api/v1/auth/request-otp", json={"phone": "+1234567890"})
    client.post("/api/v1/auth/verify-otp", json={"phone": "+1234567890", "code": "000000"})

    from app.models.auth import OTPChallenge
    challenge = db_session.query(OTPChallenge).filter_by(
        phone="+1234567890", status="pending"
    ).order_by(OTPChallenge.created_at.desc()).first()
    
    assert challenge is not None
    assert challenge.attempts == 1


def test_verify_otp_code_too_short_returns_422(client: TestClient):
    """Pydantic min_length=6 on the code field must reject codes shorter than 6 chars."""
    response = client.post("/api/v1/auth/verify-otp", json={
        "phone": "+1234567890",
        "code": "12345"  # 5 chars
    })
    assert response.status_code == 422


def test_verify_otp_code_too_long_returns_422(client: TestClient):
    """Pydantic max_length=6 on the code field must reject codes longer than 6 chars."""
    response = client.post("/api/v1/auth/verify-otp", json={
        "phone": "+1234567890",
        "code": "1234567"  # 7 chars
    })
    assert response.status_code == 422


def test_verify_otp_idempotent_user(client: TestClient, db_session: Session):
    """Verifying OTP twice for same phone should not create a second user."""
    from app.models.auth import User, OTPChallenge
    from app.core.security import get_password_hash as hash_pw
    from datetime import datetime, timedelta, timezone

    # First verification creates the user
    client.post("/api/v1/auth/request-otp", json={"phone": "+1234567890"})
    client.post("/api/v1/auth/verify-otp", json={"phone": "+1234567890", "code": "123456"})

    # Second verification – need a fresh challenge
    otp_hash = hash_pw("123456")
    challenge = OTPChallenge(
        phone="+1234567890",
        otp_hash=otp_hash,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db_session.add(challenge)
    db_session.commit()

    client.post("/api/v1/auth/verify-otp", json={"phone": "+1234567890", "code": "123456"})

    count = db_session.query(User).filter_by(phone="+1234567890").count()
    assert count == 1


# ---------------------------------------------------------------------------
# Additional edge cases – staff login
# ---------------------------------------------------------------------------

def test_staff_login_wrong_password(client: TestClient, db_session: Session):
    from app.models.auth import User
    from app.core.security import get_password_hash as hash_pw

    hashed_pw = hash_pw("correct_pass")
    user = User(username="staff_edge", hashed_password=hashed_pw, is_active=True)
    db_session.add(user)
    db_session.commit()

    response = client.post("/api/v1/auth/staff/login", json={
        "username": "staff_edge",
        "password": "wrong_pass"
    })
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]


def test_staff_login_nonexistent_user(client: TestClient):
    response = client.post("/api/v1/auth/staff/login", json={
        "username": "does_not_exist",
        "password": "any_pass"
    })
    assert response.status_code == 401


def test_staff_login_user_without_password(client: TestClient, db_session: Session):
    """OTP-only user (no hashed_password) should not be able to use staff login."""
    from app.models.auth import User
    user = User(username="otp_only_edge", hashed_password=None, is_active=True)
    db_session.add(user)
    db_session.commit()

    response = client.post("/api/v1/auth/staff/login", json={
        "username": "otp_only_edge",
        "password": "any_pass"
    })
    assert response.status_code == 401


def test_staff_login_returns_refresh_token(client: TestClient, db_session: Session):
    from app.models.auth import User
    from app.core.security import get_password_hash as hash_pw

    hashed_pw = hash_pw("mypassword")
    user = User(username="staff_refresh_check", hashed_password=hashed_pw, is_active=True)
    db_session.add(user)
    db_session.commit()

    response = client.post("/api/v1/auth/staff/login", json={
        "username": "staff_refresh_check",
        "password": "mypassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


# ---------------------------------------------------------------------------
# Additional edge cases – /me endpoint
# ---------------------------------------------------------------------------

def test_get_me_invalid_token(client: TestClient):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.garbage"}
    )
    assert response.status_code == 401


def test_get_me_inactive_user(client: TestClient, db_session: Session):
    """Inactive users should be rejected even with a valid token."""
    from app.models.auth import User
    from app.core.security import create_access_token

    user = User(phone="+5559998888", is_active=False)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(subject=str(user.id))
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401


def test_get_me_response_has_expected_fields(client: TestClient, db_session: Session):
    client.post("/api/v1/auth/request-otp", json={"phone": "+1234567890"})
    login_response = client.post("/api/v1/auth/verify-otp", json={
        "phone": "+1234567890",
        "code": "123456"
    })
    token = login_response.json()["access_token"]

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert me_response.status_code == 200
    data = me_response.json()
    assert "id" in data
    assert "phone" in data
    assert "is_active" in data
    assert data["is_active"] is True


def test_get_me_user_not_in_db(client: TestClient, db_session: Session):
    """A valid token whose user_id doesn't exist in the DB should get 401."""
    from app.core.security import create_access_token
    ghost_id = "00000000-0000-0000-0000-000000000000"
    token = create_access_token(subject=ghost_id)

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# request_otp – additional edge cases
# ---------------------------------------------------------------------------

def test_request_otp_different_phone(client: TestClient, db_session: Session):
    """Any phone other than the test number should also get a challenge created."""
    from app.models.auth import OTPChallenge
    response = client.post("/api/v1/auth/request-otp", json={"phone": "+9998887776"})
    assert response.status_code == 200
    challenge = db_session.query(OTPChallenge).filter_by(phone="+9998887776").first()
    assert challenge is not None
    assert challenge.status == "pending"


def test_request_otp_missing_phone_returns_422(client: TestClient):
    """Phone field is required; missing it should fail validation."""
    response = client.post("/api/v1/auth/request-otp", json={})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# PATCH /me profile registration – new onboarding flow tests
# ---------------------------------------------------------------------------

def test_patch_me_profile_success(client: TestClient, db_session: Session):
    from app.models.patient import Patient
    
    # 1. Log in via OTP
    client.post("/api/v1/auth/request-otp", json={"phone": "+1234567890"})
    login_response = client.post("/api/v1/auth/verify-otp", json={
        "phone": "+1234567890",
        "code": "123456"
    })
    token = login_response.json()["access_token"]

    # 2. PATCH profile name
    patch_response = client.patch(
        "/api/v1/auth/me",
        json={"full_name": "Test Aditya", "preferred_language": "pa"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert patch_response.status_code == 200
    data = patch_response.json()
    assert data["full_name"] == "Test Aditya"
    
    # 3. Verify Patient clinical record was automatically spawned and linked
    patient = db_session.query(Patient).filter_by(phone="+1234567890").first()
    assert patient is not None
    assert patient.full_name == "Test Aditya"
    assert patient.preferred_language == "pa"


def test_patch_me_profile_invalid_name_422(client: TestClient):
    # Log in via OTP
    client.post("/api/v1/auth/request-otp", json={"phone": "+1234567890"})
    login_response = client.post("/api/v1/auth/verify-otp", json={
        "phone": "+1234567890",
        "code": "123456"
    })
    token = login_response.json()["access_token"]

    # PATCH with a name that is too short
    patch_response = client.patch(
        "/api/v1/auth/me",
        json={"full_name": "A", "preferred_language": "en"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert patch_response.status_code == 422