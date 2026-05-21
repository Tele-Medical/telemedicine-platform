from abc import ABC, abstractmethod
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class SMSProvider(ABC):
    """
    Abstract Base Class for SMS delivery.
    Allows swapping between Mock, AWS SNS, Twilio, Gupshup, etc.
    """

    @abstractmethod
    def send_sms(self, to_phone: str, message: str) -> bool:
        """
        Sends an SMS message to the specified phone number.
        Returns True if the provider accepted the request, False otherwise.
        """
        pass

class MockSMSProvider(SMSProvider):
    """
    Mock provider for local development and testing.
    Logs that an SMS was sent without exposing the actual message content.
    """

    def send_sms(self, to_phone: str, message: str) -> bool:
        """
        Simulates sending an SMS by logging the event with a masked phone number.
        """
        masked_phone = "****" + to_phone[-2:] if len(to_phone) > 2 else "**"
        logger.info(f"MOCK SMS sent to {masked_phone} (content hidden for privacy)")
        # For local development only, developers can check the challenge table in the DB
        return True

class TwilioSMSProvider(SMSProvider):
    """
    Real Twilio SMS implementation.
    """
    def __init__(self):
        from twilio.rest import Client
        self.account_sid = settings.twilio_account_sid
        self.auth_token = settings.twilio_auth_token
        self.from_number = settings.twilio_from_number

        if not self.account_sid or not self.auth_token or not self.from_number:
            logger.warning(
                "Twilio config missing (account_sid/auth_token/from_number). "
                "SMS sending will fail."
            )
            raise ValueError("Twilio config missing")

        self.client = Client(self.account_sid, self.auth_token)

    def send_sms(self, to_phone: str, message: str) -> bool:
        """
        Sends an SMS using the Twilio REST API.
        Masks the phone number in logs and handles exceptions securely.
        """
        masked_phone = "****" + to_phone[-2:] if len(to_phone) > 2 else "**"
        try:
            self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_phone
            )
            logger.info(f"TWILIO SMS successfully queued for {masked_phone}")
            return True
        except Exception:
            # Mask error details to prevent PII/API key leakage in logs
            logger.error(f"Twilio API request failed for {masked_phone}")
            return False

def get_sms_provider() -> SMSProvider:
    """
    Returns the appropriate SMS provider based on environment configuration.
    This prevents hardcoding 'Mock' or 'Twilio' in the business logic.
    """
    provider_type = (settings.sms_provider or "mock").lower()
    
    if provider_type == "twilio":
        return TwilioSMSProvider()
    if provider_type == "mock":
        return MockSMSProvider()

    logger.error(
        "Unknown SMS_PROVIDER '%s'. Refusing fallback in OTP path.",
        provider_type,
    )
    raise ValueError(f"Unsupported SMS provider: {provider_type}")
