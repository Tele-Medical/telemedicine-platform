import logging
from typing import Dict, Any, Optional
from app.integrations.sms.sms_provider import get_sms_provider

logger = logging.getLogger(__name__)

# Basic templating dictionary. 
# In a full production app, you might use Jinja2 or a dedicated i18n library.
MESSAGE_TEMPLATES = {
    "APPOINTMENT_CONFIRMED": {
        "en": "Your appointment is confirmed for {time}. Patient: {patient_name}.",
        "pa": "ਤੁਹਾਡੀ ਮੁਲਾਕਾਤ {time} ਲਈ ਪੱਕੀ ਹੋ ਗਈ ਹੈ। ਮਰੀਜ਼: {patient_name}.",
        "hi": "आपकी नियुक्ति {time} के लिए पक्की हो गई है। मरीज: {patient_name}."
    },
    "PRESCRIPTION_READY": {
        "en": "Your prescription is ready for pickup at {pharmacy_name}.",
        "pa": "ਤੁਹਾਡੀ ਦਵਾਈ {pharmacy_name} ਤੋਂ ਲੈਣ ਲਈ ਤਿਆਰ ਹੈ।",
        "hi": "आपकी दवा {pharmacy_name} से लेने के लिए तैयार है।"
    },
    "TEST": {
        "en": "Test message.",
        "pa": "ਟੈਸਟ ਸੁਨੇਹਾ.",
        "hi": "परीक्षण संदेश."
    }
}

class NotificationService:
    """
    Central orchestrator for all outbound notifications (SMS, Push, Email).
    Ensures business logic is decoupled from specific providers like Twilio.
    """

    def __init__(self):
        # We fetch the provider here so that if the config changes, we get the right one.
        # Alternatively, it could be injected.
        pass

    def _get_template(self, event_type: str, language: str) -> str:
        templates = MESSAGE_TEMPLATES.get(event_type)
        if not templates:
            logger.warning(f"No templates found for event type: {event_type}")
            return "Notification" # Fallback empty message

        # Fallback to English if requested language template is missing
        return templates.get(language, templates.get("en", "Notification"))

    def dispatch_alert(self, user_id: str, phone: Optional[str], event_type: str, context_data: Dict[str, Any]) -> bool:
        """
        Dispatches an alert to the user. Currently routes to SMS.
        Future implementations can check user preferences (e.g., WhatsApp vs SMS vs Push).
        """
        if not phone:
            logger.warning(f"Cannot dispatch alert: No phone number provided for user {user_id}")
            return False

        language = context_data.get("language", "en")
        template = self._get_template(event_type, language)
        
        # Format the message safely
        try:
            message = template.format(**context_data)
        except KeyError as e:
            logger.error(f"Missing context variable for template formatting: {e}")
            # Try to send the raw template or a degraded message
            message = template

        try:
            sms_provider = get_sms_provider()
            success = sms_provider.send_sms(to_phone=phone, message=message)
            
            if success:
                logger.info(f"Successfully dispatched {event_type} alert to user {user_id}")
            else:
                logger.warning(f"Failed to dispatch {event_type} alert to user {user_id} via SMS provider")
            
            return success
        except Exception as e:
            # We catch ALL exceptions here so that a failure in Twilio/SNS
            # does not crash the calling API endpoint (e.g., appointment booking).
            logger.error(f"Critical failure while dispatching notification {event_type} to user {user_id}: {e}", exc_info=True)
            return False
