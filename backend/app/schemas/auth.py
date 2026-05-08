from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

class OTPRequest(BaseModel):
    phone: str = Field(..., description="The phone number to send the OTP to")

class OTPVerify(BaseModel):
    phone: str
    code: str = Field(..., min_length=6, max_length=6)

class StaffLogin(BaseModel):
    username: str
    password: str

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
    
    class Config:
        from_attributes = True
