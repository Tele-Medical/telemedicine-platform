"""
Abstraction layer for object storage.
Supports multiple providers (Local, S3) to allow for easy environment swapping.
"""
from abc import ABC, abstractmethod
import os
import uuid
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class StorageProvider(ABC):
    """
    Abstract Base Class for Object Storage.
    Allows swapping between Local Storage, AWS S3, MinIO, GCP, etc.
    """

    @abstractmethod
    def upload_file(self, file_name: str, file_data: bytes, content_type: str) -> str:
        """
        Uploads a file and returns its unique URI.
        """
        pass

    @abstractmethod
    def download_file(self, file_uri: str) -> bytes:
        """
        Retrieves the raw bytes of a file.
        """
        pass

    @abstractmethod
    def delete_file(self, file_uri: str) -> bool:
        """
        Removes a file from the storage provider.
        """
        pass

    @abstractmethod
    def get_signed_url(self, file_uri: str, expiration_seconds: int = 900) -> str:
        """
        Generates a temporary, secure URL for accessing a protected file.
        """
        pass

class LocalStorageProvider(StorageProvider):
    """
    Local file system storage for development and testing.
    Stores files in a configurable local directory.
    """
    
    def __init__(self, base_path: str = "./local_storage"):
        self.base_path = os.path.abspath(base_path)
        os.makedirs(self.base_path, exist_ok=True)

    def _get_safe_path(self, file_name: str) -> str:
        """
        Ensures the generated path is within the base_path to prevent traversal attacks.
        """
        file_path = os.path.abspath(os.path.join(self.base_path, file_name))
        if not file_path.startswith(self.base_path):
            raise ValueError("Path traversal attack detected")
        return file_path

    def upload_file(self, file_name: str, file_data: bytes, content_type: str) -> str:
        """
        Saves file to the local disk with a unique UUID prefix.
        """
        unique_name = f"{uuid.uuid4()}_{os.path.basename(file_name)}"
        file_path = self._get_safe_path(unique_name)
        
        with open(file_path, "wb") as f:
            f.write(file_data)
            
        logger.info(f"Saved file to local storage: {file_path}")
        return file_path

    def download_file(self, file_uri: str) -> bytes:
        """
        Reads file content from the local disk.
        """
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
        """
        Deletes the file from the local disk.
        """
        if not os.path.isabs(file_uri):
            file_uri = os.path.abspath(os.path.join(self.base_path, os.path.basename(file_uri)))
            
        if not file_uri.startswith(self.base_path):
             raise ValueError("Path traversal attack detected")

        if os.path.exists(file_uri):
            os.remove(file_uri)
            return True
        return False

    def get_signed_url(self, file_uri: str, expiration_seconds: int = 900) -> str:
        """
        Simulates a signed URL for local storage.
        """
        file_name = os.path.basename(file_uri)
        # Assuming we would have an endpoint like /api/v1/storage/download/{file_name}
        return f"/api/v1/storage/local/{file_name}?expires_in={expiration_seconds}"

class S3StorageProvider(StorageProvider):
    """
    Production-grade AWS S3 Storage implementation using boto3.
    Requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.
    """
    def __init__(self):
        import boto3
        self.bucket_name = settings.s3_bucket_name
        
        if not settings.aws_access_key_id or not settings.aws_secret_access_key or not self.bucket_name:
            logger.warning("AWS S3 credentials or bucket name missing. Storage operations will fail.")
            raise ValueError("AWS S3 credentials missing")
            
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region_name
        )

    def upload_file(self, file_name: str, file_data: bytes, content_type: str) -> str:
        """
        Uploads file to the configured S3 bucket.
        """
        unique_name = f"{uuid.uuid4()}_{file_name}"
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=unique_name,
                Body=file_data,
                ContentType=content_type
            )
            logger.info(f"Uploaded to S3: {unique_name}")
            return f"s3://{self.bucket_name}/{unique_name}"
        except Exception as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise

    def download_file(self, file_uri: str) -> bytes:
        """
        Downloads the file body from S3.
        """
        try:
            key = file_uri.replace(f"s3://{self.bucket_name}/", "")
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body'].read()
        except Exception as e:
            logger.error(f"Failed to download from S3: {e}")
            raise

    def delete_file(self, file_uri: str) -> bool:
        """
        Performs a delete operation on the S3 object.
        """
        try:
            key = file_uri.replace(f"s3://{self.bucket_name}/", "")
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"Deleted from S3: {key}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False

    def get_signed_url(self, file_uri: str, expiration_seconds: int = 900) -> str:
        """
        Generates an authentic AWS S3 Pre-signed URL.
        """
        try:
            key = file_uri.replace(f"s3://{self.bucket_name}/", "")
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key
                },
                ExpiresIn=expiration_seconds
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate signed URL: {e}")
            raise

def get_storage_provider() -> StorageProvider:
    """
    Factory function to return the correct storage implementation based on settings.
    """
    provider_type = settings.storage_provider.lower()
    
    if provider_type == "s3":
        return S3StorageProvider()
    elif provider_type == "local":
        return LocalStorageProvider()
    else:
        logger.warning(f"Unknown STORAGE_PROVIDER '{provider_type}', falling back to Local.")
        return LocalStorageProvider()
