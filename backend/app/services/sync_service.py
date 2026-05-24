import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Type, Set
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from fastapi import HTTPException

from app.models import (
    Patient,
    Allergy,
    Condition,
    MedicationRequest,
    Encounter,
    Observation,
    ProvenanceEvent,
    SyncConflict,
    SyncCursor,
    User,
)
from app.schemas.sync import (
    SyncPushRequest,
    SyncPushResponse,
    SyncOperation,
    SyncAction,
    SyncPullResponse,
    ConflictResolutionStrategy,
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

# Fields that are protected and cannot be updated via raw payload
PROTECTED_FIELDS: Set[str] = {
    "id",
    "created_at",
    "updated_at",
    "created_by_user_id",
    "updated_by_user_id",
    "record_version",
}


class SyncService:
    """
    Core service for managing offline-first data synchronization between client devices and the server.
    Handles incremental pull requests, idempotent push batches, and optimistic concurrency conflicts.
    """

    @staticmethod
    def push_operations(
        db: Session, request: SyncPushRequest, current_user: User
    ) -> SyncPushResponse:
        """
        Processes a batch of sync operations.
        Uses nested transactions (savepoints) to ensure that failures in individual operations
        do not roll back the entire batch, while maintaining server-client consistency.
        """
        response = SyncPushResponse()

        for op in request.operations:
            # Use a savepoint for each operation
            db.begin_nested()
            try:
                # 1. Idempotency Check
                existing_event = db.get(ProvenanceEvent, op.operation_id)
                if existing_event:
                    response.duplicate_count += 1
                    db.commit()  # Commit the (empty) savepoint
                    continue

                # 2. Get Model and authorization check
                model_class = ENTITY_MODEL_MAP.get(op.entity_type)
                if not model_class:
                    response.error_count += 1
                    response.errors.append(
                        {
                            "operation_id": str(op.operation_id),
                            "error": f"Unknown entity type: {op.entity_type}",
                        }
                    )
                    db.rollback()
                    continue

                # 3. Authorization & Fetch
                existing_record = db.get(model_class, op.entity_id)

                # PHI Disclosure Protection: Verify ownership/access
                if existing_record:
                    if not SyncService._check_authorization(existing_record, current_user):
                        response.error_count += 1
                        response.errors.append(
                            {
                                "operation_id": str(op.operation_id),
                                "error": "Unauthorized access to record",
                            }
                        )
                        db.rollback()
                        continue

                # 4. Filter payload (Payload Injection Protection)
                filtered_payload = {
                    k: v for k, v in op.payload.items() if k not in PROTECTED_FIELDS
                }

                # 5. Action Execution
                if op.action == SyncAction.CREATE:
                    if existing_record:
                        SyncService._create_conflict(
                            db, op, existing_record, "Entity already exists on server"
                        )
                        response.conflict_count += 1
                        db.commit()  # Save the conflict record
                        continue

                    # Create record
                    new_record = model_class(id=op.entity_id, **filtered_payload)
                    if hasattr(new_record, "created_by_user_id"):
                        new_record.created_by_user_id = op.actor_user_id or current_user.id
                    if hasattr(new_record, "record_version"):
                        new_record.record_version = 1
                    if hasattr(new_record, "is_active"):
                        new_record.is_active = True

                    db.add(new_record)

                elif op.action == SyncAction.UPDATE:
                    if not existing_record:
                        response.error_count += 1
                        response.errors.append(
                            {
                                "operation_id": str(op.operation_id),
                                "error": "Entity not found for update",
                            }
                        )
                        db.rollback()
                        continue

                    # Version Check (Optimistic Concurrency)
                    server_version = getattr(existing_record, "record_version", 0)
                    if (
                        hasattr(existing_record, "record_version")
                        and op.base_version != server_version
                    ):
                        SyncService._create_conflict(db, op, existing_record, "Version mismatch")
                        response.conflict_count += 1
                        db.commit()  # Save the conflict record
                        continue

                    # Update fields
                    for key, value in filtered_payload.items():
                        setattr(existing_record, key, value)

                    if hasattr(existing_record, "updated_by_user_id"):
                        existing_record.updated_by_user_id = op.actor_user_id or current_user.id
                    if hasattr(existing_record, "record_version"):
                        existing_record.record_version += 1

                elif op.action == SyncAction.DELETE:
                    if not existing_record:
                        response.success_count += 1
                        db.commit()
                        continue

                    if hasattr(existing_record, "is_active"):
                        existing_record.is_active = False
                        if hasattr(existing_record, "record_version"):
                            existing_record.record_version += 1
                    else:
                        db.delete(existing_record)

                # 6. Record Provenance
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
                    metadata_json={"sync": True, "client_timestamp": op.created_at.isoformat()},
                )
                db.add(event)

                db.commit()  # Commit the savepoint
                response.success_count += 1

            except Exception as e:
                db.rollback()  # Rollback the savepoint
                response.error_count += 1
                response.errors.append({"operation_id": str(op.operation_id), "error": str(e)})
                continue

        return response

    @staticmethod
    def _check_authorization(record: Any, user: User) -> bool:
        """
        Enforces PHI (Protected Health Information) boundaries during synchronization.

        Args:
            record: The SQLAlchemy model instance being accessed.
            user: The authenticated User attempting the operation.

        Returns:
            bool: True if access is granted, False otherwise.

        Rules:
        - Staff (doctor, asha, admin) can access all records within their clinical scope.
        - Patients can only access their own records or records they explicitly created.
        """
        # 1. Staff users (doctor, asha, admin) have full access to sync clinical data
        if user.default_role in ["doctor", "asha", "admin"]:
            return True

        # 2. Patients can only see/modify their own data
        # Determine the patient_id of the record
        record_patient_id = None
        if isinstance(record, Patient):
            record_patient_id = record.id
        elif hasattr(record, "patient_id"):
            record_patient_id = record.patient_id

        if not record_patient_id:
            return False

        # Check if user owns this patient record
        # In our system, for patients who log in themselves, User.id matches Patient.id
        return user.id == record_patient_id

    @staticmethod
    def _create_conflict(db: Session, op: SyncOperation, existing_record: Any, reason: str):
        conflict = SyncConflict(
            entity_type=op.entity_type,
            entity_id=op.entity_id,
            base_version=op.base_version,
            server_version=getattr(existing_record, "record_version", 0),
            client_payload=op.payload,
            server_payload=SyncService._model_to_dict(existing_record),
            conflict_reason=reason,
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
    def pull_changes(
        db: Session, cursor_str: str | None, current_user: User, device_id: uuid.UUID | None = None
    ) -> SyncPullResponse:
        """
        Pulls changes from the server since the last sync.
        Uses the provided cursor or retrieves the last stored cursor for the device.
        """
        # 1. Resolve Cursor
        if not cursor_str and device_id:
            cursor_stmt = select(SyncCursor).where(
                and_(SyncCursor.user_id == current_user.id, SyncCursor.device_id == device_id)
            )
            stored_cursor = db.execute(cursor_stmt).scalar_one_or_none()
            if stored_cursor:
                cursor_str = stored_cursor.cursor_token

        if cursor_str and " " in cursor_str and "+" not in cursor_str:
            cursor_str = cursor_str.replace(" ", "+")

        try:
            last_sync = (
                datetime.fromisoformat(cursor_str)
                if cursor_str
                else datetime.min.replace(tzinfo=timezone.utc)
            )
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Invalid cursor format. Expected ISO timestamp."
            )

        all_changes: List[SyncOperation] = []
        new_max_sync = last_sync

        # 2. Query Changes
        for entity_type, model_class in ENTITY_MODEL_MAP.items():
            # PHI Protection: Patients only pull their own data
            stmt = select(model_class).where(model_class.updated_at > last_sync)

            # Simple Authorization Filter
            if current_user.default_role == "patient":
                if model_class == Patient:
                    stmt = stmt.where(
                        Patient.id == current_user.id
                    )  # Assuming User.id matches Patient.id for patients
                elif hasattr(model_class, "patient_id"):
                    stmt = stmt.where(model_class.patient_id == current_user.id)

            records = db.execute(stmt).scalars().all()

            for rec in records:
                if rec.updated_at > new_max_sync:
                    new_max_sync = rec.updated_at

                # Determine action: if is_active is False, it's a deletion/tombstone
                action = SyncAction.UPDATE
                if hasattr(rec, "is_active") and not rec.is_active:
                    action = SyncAction.DELETE

                all_changes.append(
                    SyncOperation(
                        operation_id=uuid.uuid4(),
                        entity_type=entity_type,
                        entity_id=rec.id,
                        action=action,
                        base_version=getattr(rec, "record_version", 0),
                        payload=SyncService._model_to_dict(rec),
                        created_at=rec.updated_at,
                    )
                )

        # 3. Update SyncCursor
        if device_id:
            cursor_stmt = select(SyncCursor).where(
                and_(SyncCursor.user_id == current_user.id, SyncCursor.device_id == device_id)
            )
            sync_cursor = db.execute(cursor_stmt).scalar_one_or_none()

            if not sync_cursor:
                sync_cursor = SyncCursor(user_id=current_user.id, device_id=device_id)
                db.add(sync_cursor)

            sync_cursor.last_synced_at = datetime.now(timezone.utc)
            sync_cursor.cursor_token = new_max_sync.isoformat()
            db.commit()

        return SyncPullResponse(
            changes=all_changes, new_cursor=new_max_sync.isoformat(), has_more=False
        )

    @staticmethod
    def resolve_conflict(
        db: Session,
        conflict_id: uuid.UUID,
        strategy: ConflictResolutionStrategy,
        merged_payload: Dict[str, Any] | None,
        current_user: User,
    ):
        conflict = db.get(SyncConflict, conflict_id)
        if not conflict:
            return None

        model_class = ENTITY_MODEL_MAP.get(conflict.entity_type)
        if not model_class:
            return None
        record = db.get(model_class, conflict.entity_id)

        if not record:
            return None

        # PHI Authorization
        if not SyncService._check_authorization(record, current_user):
            raise HTTPException(
                status_code=403, detail="Unauthorized to resolve conflict for this record"
            )

        # Filter payload
        payload_to_apply = {}
        if strategy == ConflictResolutionStrategy.CLIENT_WINS:
            payload_to_apply = conflict.client_payload
        elif strategy == ConflictResolutionStrategy.MANUAL_MERGE and merged_payload:
            payload_to_apply = merged_payload

        if payload_to_apply:
            filtered_payload = {
                k: v for k, v in payload_to_apply.items() if k not in PROTECTED_FIELDS
            }
            for key, value in filtered_payload.items():
                setattr(record, key, value)

        if hasattr(record, "record_version"):
            record.record_version += 1
        if hasattr(record, "updated_by_user_id"):
            record.updated_by_user_id = current_user.id

        conflict.resolved_at = datetime.now(timezone.utc)
        conflict.resolution_strategy = strategy.value
        conflict.resolved_by_user_id = current_user.id

        db.commit()
        return conflict
