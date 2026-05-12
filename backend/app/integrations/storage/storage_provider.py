from abc import ABC, abstractmethod
import os
import shutil
import uuid
import logging

logger = logging.getLogger(__name__)

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

class LocalStorageProvider(StorageProvider):
    """
    Local file system storage for development and testing.
    """
    
    def __init__(self, base_path: str = "./local_storage"):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    def upload_file(self, file_name: str, file_data: bytes, content_type: str) -> str:
        # Generate a unique filename to prevent collisions
        unique_name = f"{uuid.uuid4()}_{file_name}"
        file_path = os.path.join(self.base_path, unique_name)
        
        with open(file_path, "wb") as f:
            f.write(file_data)
            
        logger.info(f"Saved file to local storage: {file_path}")
        return file_path

    def download_file(self, file_uri: str) -> bytes:
        if not os.path.exists(file_uri):
            raise FileNotFoundError(f"File not found: {file_uri}")
            
        with open(file_uri, "rb") as f:
            return f.read()

    def delete_file(self, file_uri: str) -> bool:
        if os.path.exists(file_uri):
            os.remove(file_uri)
            return True
        return False
