import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Type
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_

from app.models import (
    Patient, Allergy, Condition, MedicationRequest, Encounter, Observation,
    ProvenanceEvent, SyncConflict, SyncCursor, User
)
from app.schemas.sync import (
    SyncPushRequest, SyncPushResponse, SyncOperation, SyncAction,
    SyncPullResponse, ConflictResolutionStrategy
)

# Mapping entity types to models
ENTITY_MODEL_MAP: Dict[str, Type] = {
    "patient": Patient,
    "allergy": Allergy,
    "condition": Condition,
    "medication_request": MedicationRequest,
    "encounter": Encounter,
    "observation": Observation,
}

class SyncService:
    @staticmethod
    def push_operations(db: Session, request: SyncPushRequest, current_user: User) -> SyncPushResponse:
        response = SyncPushResponse()
        
        for op in request.operations:
            try:
                # 1. Idempotency Check
                existing_event = db.get(ProvenanceEvent, op.operation_id)
                if existing_event:
                    response.duplicate_count += 1
                    continue
                
                # 2. Get Model
                model_class = ENTITY_MODEL_MAP.get(op.entity_type)
                if not model_class:
                    response.error_count += 1
                    response.errors.append({"operation_id": str(op.operation_id), "error": f"Unknown entity type: {op.entity_type}"})
                    continue
                
                # 3. Conflict Detection & Action Execution
                existing_record = db.get(model_class, op.entity_id)
                
                if op.action == SyncAction.CREATE:
                    if existing_record:
                        SyncService._create_conflict(db, op, existing_record, "Entity already exists on server")
                        response.conflict_count += 1
                        continue
                    
                    # Create record
                    new_record = model_class(id=op.entity_id, **op.payload)
                    if hasattr(new_record, 'created_by_user_id'):
                        new_record.created_by_user_id = op.actor_user_id or current_user.id
                    if hasattr(new_record, 'record_version'):
                        new_record.record_version = 1
                    if hasattr(new_record, 'is_active'):
                        new_record.is_active = True
                    
                    db.add(new_record)
                
                elif op.action == SyncAction.UPDATE:
                    if not existing_record:
                        response.error_count += 1
                        response.errors.append({"operation_id": str(op.operation_id), "error": "Entity not found for update"})
                        continue
                    
                    # Version Check (Optimistic Concurrency)
                    server_version = getattr(existing_record, 'record_version', 0)
                    # For append-only records like Observation, base_version might be ignored if record_version isn't used
                    if hasattr(existing_record, 'record_version') and op.base_version != server_version:
                        SyncService._create_conflict(db, op, existing_record, "Version mismatch")
                        response.conflict_count += 1
                        continue
                    
                    # Update fields
                    for key, value in op.payload.items():
                        setattr(existing_record, key, value)
                    
                    if hasattr(existing_record, 'updated_by_user_id'):
                        existing_record.updated_by_user_id = op.actor_user_id or current_user.id
                    if hasattr(existing_record, 'record_version'):
                        existing_record.record_version += 1
                
                elif op.action == SyncAction.DELETE:
                    if not existing_record:
                        response.success_count += 1 # Already gone, or never existed, we consider it success for idempotency
                        continue
                    
                    if hasattr(existing_record, 'is_active'):
                        existing_record.is_active = False
                        if hasattr(existing_record, 'record_version'):
                            existing_record.record_version += 1
                    else:
                        # Hard delete if no soft delete support? Plan says tombstones if used.
                        # For safety, let's keep hard delete as fallback or just skip if unsupported.
                        db.delete(existing_record)
                
                # 4. Record Provenance
                provenance_action = op.action.value
                if provenance_action == "delete":
                    provenance_action = "soft_delete"
                    
                event = ProvenanceEvent(
                    id=op.operation_id,
                    target_entity_table=model_class.__tablename__,
                    target_entity_id=op.entity_id,
                    actor_user_id=op.actor_user_id or current_user.id,
                    source_device_id=str(op.device_id) if op.device_id else None,
                    action=provenance_action,
                    occurred_at=op.created_at,
                    metadata_json={"sync": True, "client_timestamp": op.created_at.isoformat()}
                )
                db.add(event)
                
                db.flush()
                response.success_count += 1
                
            except Exception as e:
                db.rollback()
                response.error_count += 1
                response.errors.append({"operation_id": str(op.operation_id), "error": str(e)})
                continue

        db.commit()
        return response

    @staticmethod
    def _create_conflict(db: Session, op: SyncOperation, existing_record: Any, reason: str):
        conflict = SyncConflict(
            entity_type=op.entity_type,
            entity_id=op.entity_id,
            base_version=op.base_version,
            server_version=getattr(existing_record, 'record_version', 0),
            client_payload=op.payload,
            server_payload=SyncService._model_to_dict(existing_record),
            conflict_reason=reason
        )
        db.add(conflict)

    @staticmethod
    def _model_to_dict(model_obj: Any) -> Dict[str, Any]:
        """Convert a SQLAlchemy model to a dictionary of its columns, ensuring JSON serializability."""
        data = {}
        for c in model_obj.__table__.columns:
            val = getattr(model_obj, c.name)
            if isinstance(val, uuid.UUID):
                val = str(val)
            elif isinstance(val, datetime):
                val = val.isoformat()
            data[c.name] = val
        return data

    @staticmethod
    def pull_changes(db: Session, cursor_str: str | None, current_user: User, device_id: uuid.UUID | None = None) -> SyncPullResponse:
        # Cursor logic: for MVP, use timestamp-based cursor
        if cursor_str and " " in cursor_str and "+" not in cursor_str:
            cursor_str = cursor_str.replace(" ", "+")
            
        last_sync = datetime.fromisoformat(cursor_str) if cursor_str else datetime.min.replace(tzinfo=timezone.utc)
        
        all_changes: List[SyncOperation] = []
        new_max_sync = last_sync
        
        for entity_type, model_class in ENTITY_MODEL_MAP.items():
            # Query for changes since last_sync
            stmt = select(model_class).where(model_class.updated_at > last_sync)
            records = db.execute(stmt).scalars().all()
            
            for rec in records:
                if rec.updated_at > new_max_sync:
                    new_max_sync = rec.updated_at
                
                # Determine action: if is_active is False, it's a deletion/tombstone
                action = SyncAction.UPDATE
                if hasattr(rec, 'is_active') and not rec.is_active:
                    action = SyncAction.DELETE
                
                all_changes.append(SyncOperation(
                    operation_id=uuid.uuid4(),
                    entity_type=entity_type,
                    entity_id=rec.id,
                    action=action,
                    base_version=getattr(rec, 'record_version', 0),
                    payload=SyncService._model_to_dict(rec),
                    created_at=rec.updated_at
                ))
        
        # Update SyncCursor if device_id is provided
        if device_id:
            cursor_stmt = select(SyncCursor).where(and_(SyncCursor.user_id == current_user.id, SyncCursor.device_id == device_id))
            sync_cursor = db.execute(cursor_stmt).scalar_one_or_none()
            
            if not sync_cursor:
                sync_cursor = SyncCursor(user_id=current_user.id, device_id=device_id)
                db.add(sync_cursor)
            
            sync_cursor.last_synced_at = datetime.now(timezone.utc)
            sync_cursor.cursor_token = new_max_sync.isoformat()
            db.commit()
        
        return SyncPullResponse(
            changes=all_changes,
            new_cursor=new_max_sync.isoformat(),
            has_more=False
        )

    @staticmethod
    def resolve_conflict(db: Session, conflict_id: uuid.UUID, strategy: ConflictResolutionStrategy, merged_payload: Dict[str, Any] | None, current_user: User):
        conflict = db.get(SyncConflict, conflict_id)
        if not conflict:
            return None
        
        model_class = ENTITY_MODEL_MAP.get(conflict.entity_type)
        record = db.get(model_class, conflict.entity_id)
        
        if strategy == ConflictResolutionStrategy.CLIENT_WINS:
            for key, value in conflict.client_payload.items():
                setattr(record, key, value)
        elif strategy == ConflictResolutionStrategy.SERVER_WINS:
            pass # Keep server state
        elif strategy == ConflictResolutionStrategy.MANUAL_MERGE and merged_payload:
            for key, value in merged_payload.items():
                setattr(record, key, value)
        
        if hasattr(record, 'record_version'):
            record.record_version += 1
        if hasattr(record, 'updated_by_user_id'):
            record.updated_by_user_id = current_user.id
            
        conflict.resolved_at = datetime.now(timezone.utc)
        conflict.resolution_strategy = strategy.value
        conflict.resolved_by_user_id = current_user.id
        
        db.commit()
        return conflict
