"""Unit / integration tests for app/services/auth_service.py."""
import hashlib
import pytest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.auth import OTPChallenge, User, Session as DBSession
from app.core.security import get_password_hash, decode_token
from app.schemas.auth import OTPVerify, StaffLogin
from app.services.auth_service import hash_token, request_otp, verify_otp, authenticate_staff


# ---------------------------------------------------------------------------
# hash_token
# ---------------------------------------------------------------------------

def test_hash_token_deterministic():
    """Same input should always produce the same SHA-256 hex digest."""
    result1 = hash_token("some-token")
    result2 = hash_token("some-token")
    assert result1 == result2


def test_hash_token_matches_sha256():
    token = "my-secret-refresh-token"
    expected = hashlib.sha256(token.encode("utf-8")).hexdigest()
    assert hash_token(token) == expected


def test_hash_token_different_inputs_differ():
    assert hash_token("token-a") != hash_token("token-b")


def test_hash_token_returns_string():
    result = hash_token("anything")
    assert isinstance(result, str)


# ---------------------------------------------------------------------------
# request_otp
# ---------------------------------------------------------------------------

def test_request_otp_creates_challenge(db_session: Session):
    result = request_otp(db_session, "+9999999999")
    assert result == {"message": "OTP sent successfully"}
    challenge = db_session.query(OTPChallenge).filter_by(phone="+9999999999").first()
    assert challenge is not None
    assert challenge.status == "pending"
    assert challenge.attempts == 0


def test_request_otp_stores_hashed_not_plain(db_session: Session):
    request_otp(db_session, "+9999999998")
    challenge = db_session.query(OTPChallenge).filter_by(phone="+9999999998").first()
    assert len(challenge.otp_hash) > 6
    assert challenge.otp_hash.startswith("$2")


def test_request_otp_test_phone_uses_fixed_code(db_session: Session):
    """The test phone +1234567890 should always get OTP code 123456."""
    request_otp(db_session, "+1234567890")
    challenge = db_session.query(OTPChallenge).filter_by(phone="+1234567890").first()
    assert challenge is not None
    from app.core.security import verify_password
    assert verify_password("123456", challenge.otp_hash) is True


def test_request_otp_normal_phone_does_not_use_fixed_code(db_session: Session):
    """A normal phone should NOT get the fixed 123456 code."""
    # Note: There is a very small (1 in 900,000) chance this fails randomly, 
    # but for a unit test it's acceptable.
    request_otp(db_session, "+9990001112")
    challenge = db_session.query(OTPChallenge).filter_by(phone="+9990001112").first()
    from app.core.security import verify_password
    assert verify_password("123456", challenge.otp_hash) is False


def test_request_otp_expiry_is_in_future(db_session: Session):
    request_otp(db_session, "+9999999997")
    challenge = db_session.query(OTPChallenge).filter_by(phone="+9999999997").first()
    assert challenge.expires_at > datetime.now(timezone.utc)


def test_request_otp_multiple_challenges_same_phone(db_session: Session):
    """Multiple OTP requests for the same phone should create separate challenges."""
    request_otp(db_session, "+9999999996")
    request_otp(db_session, "+9999999996")
    count = db_session.query(OTPChallenge).filter_by(phone="+9999999996").count()
    assert count == 2


# ---------------------------------------------------------------------------
# verify_otp
# ---------------------------------------------------------------------------

def test_verify_otp_no_challenge_raises_400(db_session: Session):
    payload = OTPVerify(phone="+910000000000", code="123456")
    with pytest.raises(HTTPException) as exc_info:
        verify_otp(db_session, payload)
    assert exc_info.value.status_code == 400


def test_verify_otp_expired_challenge_raises_400(db_session: Session):
    otp_hash = get_password_hash("123456")
    expired_challenge = OTPChallenge(
        phone="+911111111111",
        otp_hash=otp_hash,
        status="pending",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),  # already expired
    )
    db_session.add(expired_challenge)
    db_session.commit()

    payload = OTPVerify(phone="+911111111111", code="123456")
    with pytest.raises(HTTPException) as exc_info:
        verify_otp(db_session, payload)
    assert exc_info.value.status_code == 400


def test_verify_otp_wrong_code_increments_attempts(db_session: Session):
    otp_hash = get_password_hash("123456")
    challenge = OTPChallenge(
        phone="+912222222222",
        otp_hash=otp_hash,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db_session.add(challenge)
    db_session.commit()

    payload = OTPVerify(phone="+912222222222", code="000000")
    with pytest.raises(HTTPException) as exc_info:
        verify_otp(db_session, payload)
    assert exc_info.value.status_code == 400

    db_session.refresh(challenge)
    assert challenge.attempts == 1


def test_verify_otp_wrong_code_multiple_attempts(db_session: Session):
    otp_hash = get_password_hash("123456")
    challenge = OTPChallenge(
        phone="+912222222223",
        otp_hash=otp_hash,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db_session.add(challenge)
    db_session.commit()

    for _ in range(3):
        with pytest.raises(HTTPException):
            verify_otp(db_session, OTPVerify(phone="+912222222223", code="000000"))

    db_session.refresh(challenge)
    assert challenge.attempts == 3


def test_verify_otp_success_marks_challenge_verified(db_session: Session):
    request_otp(db_session, "+1234567890")
    payload = OTPVerify(phone="+1234567890", code="123456")
    verify_otp(db_session, payload)

    challenge = db_session.query(OTPChallenge).filter_by(
        phone="+1234567890", status="verified"
    ).first()
    assert challenge is not None
    assert challenge.verified_at is not None


def test_verify_otp_creates_new_user_for_unknown_phone(db_session: Session):
    request_otp(db_session, "+1234567891")
    payload = OTPVerify(phone="+1234567891", code="123456")
    verify_otp(db_session, payload)

    user = db_session.query(User).filter_by(phone="+1234567891").first()
    assert user is not None
    assert user.default_role == "patient"


def test_verify_otp_reuses_existing_user(db_session: Session):
    existing_user = User(phone="+3333333333", default_role="patient")
    db_session.add(existing_user)
    db_session.commit()

    otp_hash = get_password_hash("123456")
    challenge = OTPChallenge(
        phone="+3333333333",
        otp_hash=otp_hash,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db_session.add(challenge)
    db_session.commit()

    verify_otp(db_session, OTPVerify(phone="+3333333333", code="123456"))

    user_count = db_session.query(User).filter_by(phone="+3333333333").count()
    assert user_count == 1


def test_verify_otp_returns_token_response(db_session: Session):
    request_otp(db_session, "+1234567892")
    result = verify_otp(db_session, OTPVerify(phone="+1234567892", code="123456"))

    assert result.access_token
    assert result.refresh_token
    assert result.token_type == "bearer"


def test_verify_otp_access_token_contains_user_id(db_session: Session):
    request_otp(db_session, "+1234567893")
    result = verify_otp(db_session, OTPVerify(phone="+1234567893", code="123456"))

    payload = decode_token(result.access_token)
    assert payload is not None

    user = db_session.query(User).filter_by(phone="+1234567893").first()
    assert payload["sub"] == str(user.id)


def test_verify_otp_creates_session_record(db_session: Session):
    request_otp(db_session, "+1234567894")
    verify_otp(db_session, OTPVerify(phone="+1234567894", code="123456"))

    user = db_session.query(User).filter_by(phone="+1234567894").first()
    session = db_session.query(DBSession).filter_by(user_id=user.id).first()
    assert session is not None
    assert session.refresh_token_hash is not None
    assert session.expires_at > datetime.now(timezone.utc)


def test_verify_otp_refresh_token_hash_stored(db_session: Session):
    """The stored refresh_token_hash should match hash_token(refresh_token)."""
    request_otp(db_session, "+1234567895")
    result = verify_otp(db_session, OTPVerify(phone="+1234567895", code="123456"))

    user = db_session.query(User).filter_by(phone="+1234567895").first()
    session = db_session.query(DBSession).filter_by(user_id=user.id).first()
    assert session.refresh_token_hash == hash_token(result.refresh_token)


# ---------------------------------------------------------------------------
# authenticate_staff
# ---------------------------------------------------------------------------

def test_authenticate_staff_success(db_session: Session):
    hashed_pw = get_password_hash("correct_password")
    user = User(username="staff_doc", hashed_password=hashed_pw, is_active=True, default_role="doctor")
    db_session.add(user)
    db_session.commit()

    result = authenticate_staff(db_session, StaffLogin(username="staff_doc", password="correct_password"))
    assert result.access_token
    assert result.refresh_token
    assert result.token_type == "bearer"


def test_authenticate_staff_wrong_password_raises_401(db_session: Session):
    hashed_pw = get_password_hash("correct_password")
    user = User(username="staff_wrong_pw", hashed_password=hashed_pw, is_active=True)
    db_session.add(user)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        authenticate_staff(db_session, StaffLogin(username="staff_wrong_pw", password="wrong_password"))
    assert exc_info.value.status_code == 401


def test_authenticate_staff_nonexistent_user_raises_401(db_session: Session):
    with pytest.raises(HTTPException) as exc_info:
        authenticate_staff(db_session, StaffLogin(username="ghost_user", password="some_password"))
    assert exc_info.value.status_code == 401


def test_authenticate_staff_no_password_raises_401(db_session: Session):
    """User without hashed_password (OTP-only patient) should not be able to do staff login."""
    user = User(username="otp_only_user", hashed_password=None, is_active=True)
    db_session.add(user)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        authenticate_staff(db_session, StaffLogin(username="otp_only_user", password="any_password"))
    assert exc_info.value.status_code == 401


def test_authenticate_staff_creates_session(db_session: Session):
    hashed_pw = get_password_hash("password123")
    user = User(username="staff_session", hashed_password=hashed_pw, is_active=True)
    db_session.add(user)
    db_session.commit()

    authenticate_staff(db_session, StaffLogin(username="staff_session", password="password123"))

    session = db_session.query(DBSession).filter_by(user_id=user.id).first()
    assert session is not None
    assert session.refresh_token_hash is not None


def test_authenticate_staff_access_token_contains_user_id(db_session: Session):
    hashed_pw = get_password_hash("password456")
    user = User(username="staff_token_check", hashed_password=hashed_pw, is_active=True)
    db_session.add(user)
    db_session.commit()

    result = authenticate_staff(db_session, StaffLogin(username="staff_token_check", password="password456"))
    payload = decode_token(result.access_token)
    assert payload is not None
    assert payload["sub"] == str(user.id)
