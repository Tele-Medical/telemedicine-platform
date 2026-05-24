from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pydantic import model_validator

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str
    redis_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_exp_minutes: int = 30
    refresh_token_exp_minutes: int = 60 * 24 * 7
    cors_origins_str: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    
    # Adapters
    sms_provider: str = "mock"
    ai_provider: str = "mock"
    storage_provider: str = "local"
    abdm_provider: str = "mock"
    
    # Twilio specific settings (only required if sms_provider == 'twilio')
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_number: Optional[str] = None

    # AWS S3 specific settings (only required if storage_provider == 's3')
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region_name: Optional[str] = None
    s3_bucket_name: Optional[str] = None

    # ABDM / ABHA Sandbox settings
    abdm_client_id: Optional[str] = None
    abdm_client_secret: Optional[str] = None
    abdm_gateway_url: str = "https://dev.abdm.gov.in/gateway"
    abdm_healthid_url: str = "https://healthidsbx.abdm.gov.in"

    @model_validator(mode="after")
    def validate_abdm_credentials(self) -> "Settings":
        if self.abdm_provider.lower() == "real":
            if not self.abdm_client_id or not self.abdm_client_secret:
                raise ValueError("ABDM client ID and secret are required for 'real' provider")
        return self

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()  # type: ignore[call-arg]