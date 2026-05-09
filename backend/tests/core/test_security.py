"""Unit tests for app/core/security.py (added in this PR)."""
from datetime import timedelta
from jose import jwt

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.config import settings


# ---------------------------------------------------------------------------
# verify_password / get_password_hash
# ---------------------------------------------------------------------------

def test_verify_password_correct():
    hashed = get_password_hash("secret")
    assert verify_password("secret", hashed) is True


def test_verify_password_incorrect():
    hashed = get_password_hash("secret")
    assert verify_password("wrong", hashed) is False


def test_verify_password_empty_string():
    hashed = get_password_hash("")
    assert verify_password("", hashed) is True
    assert verify_password("notempty", hashed) is False


def test_get_password_hash_not_plain():
    plain = "mypassword"
    hashed = get_password_hash(plain)
    assert hashed != plain


def test_get_password_hash_different_salts():
    """Each call should produce a different hash (random salt)."""
    h1 = get_password_hash("same")
    h2 = get_password_hash("same")
    assert h1 != h2


def test_get_password_hash_verify_roundtrip():
    plain = "roundtrip_test"
    hashed = get_password_hash(plain)
    assert verify_password(plain, hashed) is True


# ---------------------------------------------------------------------------
# create_access_token
# ---------------------------------------------------------------------------

def test_create_access_token_returns_string():
    token = create_access_token(subject="user-123")
    assert isinstance(token, str)
    assert len(token) > 0


def test_create_access_token_contains_sub():
    token = create_access_token(subject="user-abc")
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert payload["sub"] == "user-abc"


def test_create_access_token_subject_coerced_to_string():
    """Non-string subjects (e.g. UUID objects) should be stringified."""
    import uuid
    uid = uuid.uuid4()
    token = create_access_token(subject=uid)
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert payload["sub"] == str(uid)


def test_create_access_token_has_exp():
    token = create_access_token(subject="user-123")
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert "exp" in payload


def test_create_access_token_custom_expiry():
    """Token with a very short custom expiry should expire quickly."""
    short = timedelta(seconds=5)
    token = create_access_token(subject="user-123", expires_delta=short)
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    # If the expiry was respected, exp should be close to now+5s (not 30min)
    import time
    assert payload["exp"] > time.time()
    assert payload["exp"] < time.time() + 10  # well within 10 seconds of now


def test_create_access_token_default_expiry_uses_settings():
    """Default token expiry should match settings.access_token_exp_minutes."""
    import time
    token = create_access_token(subject="user-123")
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    expected_exp = time.time() + settings.access_token_exp_minutes * 60
    # Allow a 5-second window for test execution time
    assert abs(payload["exp"] - expected_exp) < 5


# ---------------------------------------------------------------------------
# create_refresh_token
# ---------------------------------------------------------------------------

def test_create_refresh_token_returns_string():
    token = create_refresh_token(subject="user-123")
    assert isinstance(token, str)


def test_create_refresh_token_contains_sub():
    token = create_refresh_token(subject="user-xyz")
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert payload["sub"] == "user-xyz"


def test_create_refresh_token_type_claim():
    """Refresh token must include type='refresh' to distinguish from access tokens."""
    token = create_refresh_token(subject="user-123")
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert payload.get("type") == "refresh"


def test_access_and_refresh_tokens_are_distinct():
    """Access token and refresh token for same subject should differ."""
    access = create_access_token(subject="user-123")
    refresh = create_refresh_token(subject="user-123")
    assert access != refresh


# ---------------------------------------------------------------------------
# decode_token
# ---------------------------------------------------------------------------

def test_decode_token_valid():
    token = create_access_token(subject="user-123")
    result = decode_token(token)
    assert result is not None
    assert result["sub"] == "user-123"


def test_decode_token_invalid_returns_none():
    result = decode_token("this.is.not.a.valid.jwt")
    assert result is None


def test_decode_token_tampered_signature_returns_none():
    """Modifying the signature portion should cause decode to return None."""
    token = create_access_token(subject="user-123")
    parts = token.split(".")
    # Corrupt the signature segment
    parts[2] = parts[2][:-4] + "XXXX"
    tampered = ".".join(parts)
    assert decode_token(tampered) is None


def test_decode_token_empty_string_returns_none():
    assert decode_token("") is None


def test_decode_token_refresh_token():
    """decode_token should also work on refresh tokens."""
    token = create_refresh_token(subject="user-456")
    result = decode_token(token)
    assert result is not None
    assert result["sub"] == "user-456"
    assert result["type"] == "refresh"