from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt, JWTError
import bcrypt
from app.core.config import settings


# Password Hashing
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# JWT Utilities
def create_access_token(subject: Union[str, Any], expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_exp_minutes)

    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.refresh_token_exp_minutes)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def decode_token(token: str) -> dict | None:
    try:
        decoded_token = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return decoded_token
    except JWTError:
        return None
