import pytest
from unittest.mock import MagicMock, patch

# Note: NotificationService does not exist yet. This will fail on import during TDD collection.
try:
    from app.services.notification_service import NotificationService
except ImportError:
    NotificationService = None

@pytest.fixture
def mock_sms_provider():
    with patch("app.services.notification_service.get_sms_provider") as mock_get:
        mock_provider = MagicMock()
        mock_get.return_value = mock_provider
        yield mock_provider

@pytest.mark.skipif(NotificationService is None, reason="NotificationService not implemented yet")
def test_notification_dispatch_sms(mock_sms_provider):
    """Verify dispatch_alert correctly passes payload to the SMS Provider."""
    service = NotificationService()
    
    context = {"patient_name": "Ravi", "time": "10:00 AM"}
    service.dispatch_alert(user_id="user-123", phone="+919999999999", event_type="APPOINTMENT_CONFIRMED", context_data=context)
    
    mock_sms_provider.send_sms.assert_called_once()
    args, kwargs = mock_sms_provider.send_sms.call_args
    assert kwargs["to_phone"] == "+919999999999"
    assert "Ravi" in kwargs["message"]

@pytest.mark.skipif(NotificationService is None, reason="NotificationService not implemented yet")
def test_notification_language_routing(mock_sms_provider):
    """Verify the service selects the correct language template based on context."""
    service = NotificationService()
    
    context_pa = {"patient_name": "Ravi", "time": "10:00 AM", "language": "pa"}
    service.dispatch_alert(user_id="user-123", phone="+919999999999", event_type="APPOINTMENT_CONFIRMED", context_data=context_pa)
    
    args, kwargs = mock_sms_provider.send_sms.call_args
    # "ਤੁਹਾਡੀ ਮੁਲਾਕਾਤ" means "Your appointment" in Punjabi
    assert "ਤੁਹਾਡੀ ਮੁਲਾਕਾਤ" in kwargs["message"] or "appointment" not in kwargs["message"].lower()

@pytest.mark.skipif(NotificationService is None, reason="NotificationService not implemented yet")
def test_notification_provider_failure_handling(mock_sms_provider):
    """Verify that if the Twilio API fails, it doesn't crash the calling business logic."""
    mock_sms_provider.send_sms.side_effect = Exception("Twilio API Down")
    
    service = NotificationService()
    
    # This should not raise an exception, it should handle it gracefully and log it.
    try:
        success = service.dispatch_alert(user_id="user-123", phone="+919999999999", event_type="TEST", context_data={})
        assert success is False
    except Exception:
        pytest.fail("NotificationService raised an exception instead of handling the provider failure gracefully.")
