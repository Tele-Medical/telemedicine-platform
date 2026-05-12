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
    Just prints the message to the console/logs instead of sending a real SMS.
    """

    def send_sms(self, to_phone: str, message: str) -> bool:
        """
        Simulates sending an SMS by printing a redacted message to the logs.
        """
        masked_phone = to_phone[:4] + "****" + to_phone[-4:] if len(to_phone) > 8 else "****"
        logger.info(f"MOCK SMS sent to {masked_phone}: <REDACTED OTP MESSAGE>")
        print(f"\n[MOCK SMS] To: {masked_phone} | Message: <REDACTED OTP MESSAGE>\n")
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
        
        if not self.account_sid or not self.auth_token:
            logger.warning("Twilio credentials missing. SMS sending will fail.")
            raise ValueError("Twilio credentials missing")
        else:
            self.client = Client(self.account_sid, self.auth_token)

    def send_sms(self, to_phone: str, message: str) -> bool:
        """
        Sends an SMS using the Twilio REST API.
        Masks the phone number in the logs and catches exceptions securely.
        """
        masked_phone = to_phone[:4] + "****" + to_phone[-4:] if len(to_phone) > 8 else "****"
        try:
            self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_phone
            )
            logger.info(f"TWILIO SMS successfully queued for {masked_phone}")
            return True
        except Exception:
            # We do not log the full exception (e) to avoid leaking PII or API tokens
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
    elif provider_type == "mock":
        return MockSMSProvider()
    else:
        logger.warning(f"Unknown SMS_PROVIDER '{provider_type}', falling back to Mock.")
        return MockSMSProvider()
