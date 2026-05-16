import pytest
from unittest.mock import MagicMock, patch
from app.integrations.storage.storage_provider import S3StorageProvider

@pytest.fixture
def mock_s3_env(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.aws_access_key_id", "test_key")
    monkeypatch.setattr("app.core.config.settings.aws_secret_access_key", "test_secret")
    monkeypatch.setattr("app.core.config.settings.s3_bucket_name", "test-bucket")

def test_s3_upload_success(mock_s3_env):
    """Verify that providing a file stream correctly uploads the file to S3."""
    with patch("boto3.client") as mock_boto:
        mock_client = MagicMock()
        mock_boto.return_value = mock_client
        
        provider = S3StorageProvider()
        file_data = b"fake_image_data"
        
        uri = provider.upload_file("wound.jpg", file_data, "image/jpeg")
        
        assert uri.startswith("s3://test-bucket/")
        assert "wound.jpg" in uri
        mock_client.put_object.assert_called_once()

def test_s3_upload_invalid_mime_type(mock_s3_env):
    """Verify that attempting to upload a dangerous file type is rejected."""
    provider = S3StorageProvider()
    file_data = b"MZ\x90\x00\x03\x00\x00\x00" # Fake exe header
    
    with pytest.raises(ValueError, match="Invalid MIME type"):
        provider.upload_file("virus.exe", file_data, "application/x-msdownload")

def test_s3_generate_signed_url(mock_s3_env):
    """Verify that the get_signed_url method generates a valid HTTP link."""
    with patch("boto3.client") as mock_boto:
        mock_client = MagicMock()
        mock_client.generate_presigned_url.return_value = "https://test-bucket.s3.amazonaws.com/temp_link"
        mock_boto.return_value = mock_client
        
        provider = S3StorageProvider()
        
        # Method to be implemented in Phase 12
        url = provider.get_signed_url("s3://test-bucket/wound.jpg", expiration_seconds=900)
        
        assert url.startswith("https://")
        mock_client.generate_presigned_url.assert_called_with(
            'get_object',
            Params={'Bucket': 'test-bucket', 'Key': 'wound.jpg'},
            ExpiresIn=900
        )

def test_s3_missing_credentials_fallback(monkeypatch):
    """Verify that missing credentials safely raises an initialization error."""
    monkeypatch.setattr("app.core.config.settings.aws_access_key_id", None)
    
    with pytest.raises(ValueError, match="AWS S3 credentials missing"):
        S3StorageProvider()
