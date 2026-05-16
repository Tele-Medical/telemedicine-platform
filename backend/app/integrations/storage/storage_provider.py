from abc import ABC, abstractmethod
import os
import uuid
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/plain"
}

class StorageProvider(ABC):
    """
    Abstract Base Class for Object Storage.
    Allows swapping between Local Storage, AWS S3, MinIO, GCP, etc.
    """

    @abstractmethod
    def upload_file(self, file_name: str, file_data: bytes, content_type: str) -> str:
        """Returns the public or internal URI of the uploaded file."""
        pass

    @abstractmethod
    def download_file(self, file_uri: str) -> bytes:
        """Returns the raw file data."""
        pass

    @abstractmethod
    def delete_file(self, file_uri: str) -> bool:
        """Deletes the file and returns success status."""
        pass

    @abstractmethod
    def get_signed_url(self, file_uri: str, expiration_seconds: int = 900) -> str:
        """Generates a temporary signed URL for secure file access."""
        pass

class LocalStorageProvider(StorageProvider):
    """
    Local file system storage for development and testing.
    """
    
    def __init__(self, base_path: str = "./local_storage"):
        self.base_path = os.path.abspath(base_path)
        os.makedirs(self.base_path, exist_ok=True)

    def _get_safe_path(self, file_name: str) -> str:
        # Prevent path traversal
        file_path = os.path.abspath(os.path.join(self.base_path, file_name))
        if not file_path.startswith(self.base_path):
            raise ValueError("Path traversal attack detected")
        return file_path

    def upload_file(self, file_name: str, file_data: bytes, content_type: str) -> str:
        if content_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Invalid MIME type: {content_type}")

        unique_name = f"{uuid.uuid4()}_{os.path.basename(file_name)}"
        file_path = self._get_safe_path(unique_name)
        
        with open(file_path, "wb") as f:
            f.write(file_data)
            
        logger.info(f"Saved file to local storage: {file_path}")
        return file_path

    def download_file(self, file_uri: str) -> bytes:
        # Re-verify safe path for download in case file_uri was manipulated
        if not os.path.isabs(file_uri):
            file_uri = os.path.abspath(os.path.join(self.base_path, os.path.basename(file_uri)))
            
        if not file_uri.startswith(self.base_path):
             raise ValueError("Path traversal attack detected")

        if not os.path.exists(file_uri):
            raise FileNotFoundError(f"File not found: {file_uri}")
            
        with open(file_uri, "rb") as f:
            return f.read()

    def delete_file(self, file_uri: str) -> bool:
        if not os.path.isabs(file_uri):
            file_uri = os.path.abspath(os.path.join(self.base_path, os.path.basename(file_uri)))
            
        if not file_uri.startswith(self.base_path):
             raise ValueError("Path traversal attack detected")

        if os.path.exists(file_uri):
            os.remove(file_uri)
            return True
        return False

    def get_signed_url(self, file_uri: str, expiration_seconds: int = 900) -> str:
        # Local storage doesn't support signed URLs directly in the same way,
        # but we could return a specific API endpoint that streams the file if authenticated.
        # For MVP, just returning the relative path or an API route.
        key = os.path.basename(file_uri)
        return f"/api/v1/uploads/local/{key}"

class S3StorageProvider(StorageProvider):
    """
    Real AWS S3 Storage implementation.
    """
    def __init__(self):
        try:
            import boto3
        except ImportError:
            raise RuntimeError("boto3 is required for S3StorageProvider. Install it via 'uv add boto3'.")

        self.bucket_name = settings.s3_bucket_name
        
        if not settings.aws_access_key_id or not settings.aws_secret_access_key or not self.bucket_name:
            logger.warning("AWS S3 credentials or bucket name missing. Storage operations will fail.")
            raise ValueError("AWS S3 credentials missing")
        
        # Initialize boto3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region_name
        )

    def upload_file(self, file_name: str, file_data: bytes, content_type: str) -> str:
        if content_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Invalid MIME type: {content_type}")

        unique_name = f"{uuid.uuid4()}_{os.path.basename(file_name)}"
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=unique_name,
                Body=file_data,
                ContentType=content_type
            )
            return f"s3://{self.bucket_name}/{unique_name}"
        except Exception as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise

    def download_file(self, file_uri: str) -> bytes:
        try:
            key = file_uri.split('/')[-1]
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body'].read()
        except Exception as e:
            logger.error(f"Failed to download from S3: {e}")
            raise

    def delete_file(self, file_uri: str) -> bool:
        try:
            key = file_uri.split('/')[-1]
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except Exception as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False

    def get_signed_url(self, file_uri: str, expiration_seconds: int = 900) -> str:
        try:
            key = file_uri.split('/')[-1]
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiration_seconds
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise

def get_storage_provider() -> StorageProvider:
    """
    Returns the appropriate Storage provider based on environment configuration.
    """
    provider_type = settings.storage_provider.lower()
    
    if provider_type == "s3":
        return S3StorageProvider()
    elif provider_type == "local":
        return LocalStorageProvider()
    else:
        logger.warning(f"Unknown STORAGE_PROVIDER '{provider_type}', falling back to Local.")
        return LocalStorageProvider()
