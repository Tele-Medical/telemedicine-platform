from abc import ABC, abstractmethod
import logging

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
        # In a real app, this would be an API call
        logger.info(f"MOCK SMS sent to {to_phone}: {message}")
        print(f"\n[MOCK SMS] To: {to_phone} | Message: {message}\n")
        return True
