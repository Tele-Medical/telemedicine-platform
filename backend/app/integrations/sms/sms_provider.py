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
        pass

class MockSMSProvider(SMSProvider):
    """
    Mock provider for local development and testing.
    Just prints the message to the console/logs instead of sending a real SMS.
    """

    def send_sms(self, to_phone: str, message: str) -> bool:
        logger.info(f"MOCK SMS sent to {to_phone}: {message}")
        print(f"\n[MOCK SMS] To: {to_phone} | Message: {message}\n")
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
            self.client = None
        else:
            self.client = Client(self.account_sid, self.auth_token)

    def send_sms(self, to_phone: str, message: str) -> bool:
        try:
            if self.client:
                self.client.messages.create(
                    body=message,
                    from_=self.from_number,
                    to=to_phone
                )
                logger.info(f"TWILIO SMS sent to {to_phone}")
                return True
            else:
                logger.error("Twilio client is not initialized.")
                return False
        except Exception as e:
            logger.error(f"Failed to send Twilio SMS: {e}")
            return False

# The Factory Method for Dependency Injection
def get_sms_provider() -> SMSProvider:
    """
    Returns the appropriate SMS provider based on environment configuration.
    This prevents hardcoding 'Mock' or 'Twilio' in the business logic.
    """
    provider_type = settings.sms_provider.lower()
    
    if provider_type == "twilio":
        return TwilioSMSProvider()
    elif provider_type == "mock":
        return MockSMSProvider()
    else:
        logger.warning(f"Unknown SMS_PROVIDER '{provider_type}', falling back to Mock.")
        return MockSMSProvider()
