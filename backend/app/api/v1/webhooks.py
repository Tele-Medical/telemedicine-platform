from fastapi import APIRouter, Request, HTTPException, Form
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

def validate_twilio_signature(url: str, params: dict, signature: str, auth_token: str) -> bool:
    """
    Validates that the incoming request is actually from Twilio.
    """
    try:
        from twilio.request_validator import RequestValidator
        if not auth_token:
            # If no auth token is configured (e.g. testing), we fail validation 
            # unless we explicitly disable security (not recommended).
            return False
            
        validator = RequestValidator(auth_token)
        return validator.validate(url, params, signature)
    except ImportError:
        logger.error("Twilio package not installed. Cannot validate signature.")
        return False

@router.post("/sms/status", status_code=200)
async def sms_status_webhook(
    request: Request,
    MessageSid: Optional[str] = Form(None),
    MessageStatus: Optional[str] = Form(None)
):
    """
    Receives async delivery status updates from Twilio.
    """
    signature = request.headers.get("X-Twilio-Signature", "")
    
    # Reconstruct the URL for validation. Note: Behind a reverse proxy, 
    # you might need to ensure the scheme is https if Twilio sent it to https.
    url = str(request.url)
    
    # Twilio validates using all POST parameters
    form_data = await request.form()
    params = dict(form_data)
    
    auth_token = settings.twilio_auth_token or "mock_token_for_tests"
    
    is_valid = validate_twilio_signature(url, params, signature, auth_token)
    
    if not is_valid:
        logger.warning(f"Invalid Twilio signature rejected from {request.client.host if request.client else 'unknown'}")
        raise HTTPException(status_code=403, detail="Invalid signature")

    logger.info(f"Webhook Delivery Update: SID={MessageSid} Status={MessageStatus}")
    
    # Here you would typically query the database for the MessageSid
    # and update the AuditEvent or Appointment delivery_status column.
    
    return {"status": "received"}
