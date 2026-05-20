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
from app.integrations.storage.storage_provider import LocalStorageProvider

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

from moto import mock_aws
import boto3
from app.integrations.storage.storage_provider import S3StorageProvider

@mock_aws
def test_s3_storage_provider(monkeypatch):
    monkeypatch.setattr(settings, "s3_bucket_name", "test-bucket")
    monkeypatch.setattr(settings, "aws_access_key_id", "test-key")
    monkeypatch.setattr(settings, "aws_secret_access_key", "test-secret")
    monkeypatch.setattr(settings, "aws_region_name", "us-east-1")

    # Moto requires us to create the bucket before using it
    s3 = boto3.client('s3', region_name="us-east-1")
    s3.create_bucket(Bucket="test-bucket")

    provider = S3StorageProvider()
    
    file_content = b"test s3 file content"
    file_name = "test_s3_file.txt"
    
    # Upload
    file_uri = provider.upload_file(file_name=file_name, file_data=file_content, content_type="text/plain")
    assert file_uri.startswith("s3://test-bucket/")
    assert "test_s3_file.txt" in file_uri
    
    # Download
    downloaded_content = provider.download_file(file_uri)
    assert downloaded_content == file_content
    
    # Generate Signed URL
    signed_url = provider.get_signed_url(file_uri, expiration_seconds=60)
    assert signed_url is not None
    assert "AWSAccessKeyId=test-key" in signed_url
    assert "test-bucket" in signed_url

    # Delete
    success = provider.delete_file(file_uri)
    assert success is True

