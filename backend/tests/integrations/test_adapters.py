import pytest
from unittest.mock import patch
import uuid

from app.core.config import settings
from app.integrations.sms.sms_provider import (
    SMSProvider,
    MockSMSProvider,
    TwilioSMSProvider,
    get_sms_provider,
)
from app.integrations.storage.storage_provider import StorageProvider, LocalStorageProvider

def test_mock_sms_provider():
    provider = MockSMSProvider()
    
    # Should not raise any exceptions
    success = provider.send_sms(to_phone="+919876543210", message="Your OTP is 123456")
    assert success is True

@patch("app.integrations.sms.sms_provider.MockSMSProvider.send_sms")
def test_sms_provider_interface(mock_send):
    mock_send.return_value = True
    provider: SMSProvider = MockSMSProvider()
    result = provider.send_sms(to_phone="+911234567890", message="Test")
    assert result is True
    mock_send.assert_called_once_with(to_phone="+911234567890", message="Test")


def test_get_sms_provider_rejects_unknown_provider(monkeypatch):
    monkeypatch.setattr(settings, "sms_provider", "bad-provider")

    with pytest.raises(ValueError, match="Unsupported SMS provider: bad-provider"):
        get_sms_provider()


@patch("twilio.rest.Client")
def test_twilio_provider_requires_from_number(mock_client, monkeypatch):
    monkeypatch.setattr(settings, "sms_provider", "twilio")
    monkeypatch.setattr(settings, "twilio_account_sid", "sid")
    monkeypatch.setattr(settings, "twilio_auth_token", "token")
    monkeypatch.setattr(settings, "twilio_from_number", None)

    with pytest.raises(ValueError, match="Twilio config missing"):
        TwilioSMSProvider()

    mock_client.assert_not_called()

def test_local_storage_provider(tmp_path):
    # tmp_path is a pytest fixture that provides a temporary directory unique to the test invocation
    provider = LocalStorageProvider(base_path=str(tmp_path))
    
    file_content = b"test file content"
    file_name = f"test_{uuid.uuid4()}.txt"
    
    # Upload
    file_url = provider.upload_file(file_name=file_name, file_data=file_content, content_type="text/plain")
    assert file_url is not None
    assert str(tmp_path) in file_url
    
    # Download
    downloaded_content = provider.download_file(file_url)
    assert downloaded_content == file_content
    
    # Delete
    success = provider.delete_file(file_url)
    assert success is True
    
    # Download after delete should fail or return None
    with pytest.raises(FileNotFoundError):
        provider.download_file(file_url)
