import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.models.auth import User
from app.schemas.sync import (
    SyncPushRequest, SyncPushResponse, SyncPullResponse,
    ConflictResolutionRequest
)
from app.services.sync_service import SyncService

router = APIRouter(prefix="/sync", tags=["sync"])

@router.post("/push", response_model=SyncPushResponse)
def push_sync(
    request: SyncPushRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Push offline changes to the server.
    Handles idempotency and conflict detection.
    """
    return SyncService.push_operations(db, request, current_user)

@router.get("/pull", response_model=SyncPullResponse)
def pull_sync(
    cursor: str | None = Query(None),
    device_id: uuid.UUID | None = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Pull incremental changes from the server since the provided cursor.
    """
    return SyncService.pull_changes(db, cursor, current_user, device_id)

@router.post("/conflicts/{conflict_id}/resolve")
def resolve_sync_conflict(
    conflict_id: uuid.UUID,
    request: ConflictResolutionRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Manually resolve a sync conflict.
    """
    resolved = SyncService.resolve_conflict(db, conflict_id, request.strategy, request.merged_payload, current_user)
    if not resolved:
        raise HTTPException(status_code=404, detail="Conflict not found")
    return {"message": "Conflict resolved successfully"}
