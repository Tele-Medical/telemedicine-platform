import uuid
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field, model_validator
from enum import Enum

class SyncAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

class SyncOperation(BaseModel):
    operation_id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    action: SyncAction
    base_version: int = 0
    payload: dict
    actor_user_id: Optional[uuid.UUID] = None
    device_id: Optional[uuid.UUID] = None
    created_at: datetime

class SyncPushRequest(BaseModel):
    operations: List[SyncOperation]

class SyncPushResponse(BaseModel):
    success_count: int = 0
    duplicate_count: int = 0
    conflict_count: int = 0
    error_count: int = 0
    errors: List[dict] = []

class SyncPullResponse(BaseModel):
    changes: List[SyncOperation]
    new_cursor: str
    has_more: bool = False

class ConflictResolutionStrategy(str, Enum):
    CLIENT_WINS = "client_wins"
    SERVER_WINS = "server_wins"
    MANUAL_MERGE = "manual_merge"

class ConflictResolutionRequest(BaseModel):
    strategy: ConflictResolutionStrategy
    merged_payload: Optional[dict] = None

    @model_validator(mode="after")
    def validate_manual_merge(self) -> "ConflictResolutionRequest":
        if self.strategy == ConflictResolutionStrategy.MANUAL_MERGE and self.merged_payload is None:
            raise ValueError("merged_payload is required for MANUAL_MERGE strategy")
        return self
