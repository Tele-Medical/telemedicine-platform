from pydantic import BaseModel, Field, ConfigDict, field_validator
from uuid import UUID
from typing import Literal


class OTPRequest(BaseModel):
    phone: str = Field(
        ...,
        pattern=r"^\+?[1-9]\d{1,14}$",
        description="The phone number to send the OTP to (E.164 format)",
    )

    @field_validator("phone")
    @classmethod
    def format_phone(cls, v: str) -> str:
        if len(v) == 10 and v.isdigit():
            return f"+91{v}"
        if not v.startswith("+"):
            return f"+{v}"
        return v


class OTPVerify(BaseModel):
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("phone")
    @classmethod
    def format_phone(cls, v: str) -> str:
        if len(v) == 10 and v.isdigit():
            return f"+91{v}"
        if not v.startswith("+"):
            return f"+{v}"
        return v


class StaffLogin(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    username: str | None = None
    phone: str | None = None
    full_name: str | None = None
    default_role: str | None = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    preferred_language: Literal["en", "pa", "hi"] = "pa"
