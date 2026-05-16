from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

# This assumes you will add the webhook router to app.api.router or main.py
client = TestClient(app)

def test_webhook_valid_signature():
    """Verify that a webhook request with a valid Twilio signature is accepted."""
    # We will need to mock the Twilio signature validator
    with patch("app.api.v1.webhooks.validate_twilio_signature", return_value=True):
        payload = {
            "MessageSid": "SM1234567890abcdef",
            "MessageStatus": "delivered",
            "To": "+919999999999"
        }
        headers = {"X-Twilio-Signature": "valid_mock_signature"}
        
        response = client.post("/api/v1/webhooks/sms/status", data=payload, headers=headers)
        
        # Even if the route isn't fully implemented with DB yet, it shouldn't 404
        assert response.status_code in [200, 202]

def test_webhook_invalid_signature_rejected():
    """CRITICAL: Verify fake requests from malicious IPs without a valid signature are rejected."""
    with patch("app.api.v1.webhooks.validate_twilio_signature", return_value=False):
        payload = {
            "MessageSid": "SM1234567890abcdef",
            "MessageStatus": "delivered",
        }
        headers = {"X-Twilio-Signature": "fake_signature_from_hacker"}
        
        response = client.post("/api/v1/webhooks/sms/status", data=payload, headers=headers)
        
        assert response.status_code in [401, 403]

def test_webhook_unknown_message_sid():
    """Verify the system gracefully ignores status updates for unknown messages."""
    with patch("app.api.v1.webhooks.validate_twilio_signature", return_value=True):
        payload = {
            "MessageSid": "UNKNOWN_SID",
            "MessageStatus": "failed",
        }
        headers = {"X-Twilio-Signature": "valid"}
        
        response = client.post("/api/v1/webhooks/sms/status", data=payload, headers=headers)
        
        # It shouldn't crash with a 500 Server Error
        assert response.status_code in [200, 202]
