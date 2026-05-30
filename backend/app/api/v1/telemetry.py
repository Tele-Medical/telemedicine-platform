from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
import json
import asyncio
import logging

from app.api import deps
from app.core.security import decode_token
from app.models import User, Appointment
from app.core.redis import redis_client

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """
    Manages active WebSocket connections for WebRTC signaling.
    Uses Redis Pub/Sub to synchronize messages across multiple server workers/instances.
    """

    def __init__(self):
        # Maps appointment_id -> list of active websockets in this specific process
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, appointment_id: str):
        """Accepts the WebSocket and registers it to a specific room."""
        await websocket.accept()
        if appointment_id not in self.active_connections:
            self.active_connections[appointment_id] = []
        self.active_connections[appointment_id].append(websocket)

    def disconnect(self, websocket: WebSocket, appointment_id: str):
        """Removes the WebSocket from the room registry."""
        if appointment_id in self.active_connections:
            if websocket in self.active_connections[appointment_id]:
                self.active_connections[appointment_id].remove(websocket)
            if not self.active_connections[appointment_id]:
                del self.active_connections[appointment_id]

    async def publish_to_room(
        self, message: dict, appointment_id: str, exclude_socket: Optional[WebSocket] = None
    ):
        """
        Publishes a message to the Redis channel for a specific appointment.
        All server instances subscribed to this channel will receive and relay the message.
        """
        channel = f"telemetry:room:{appointment_id}"
        try:
            await redis_client.publish(channel, json.dumps(message))
        except Exception as e:
            logger.error(f"Redis publish error in room {appointment_id}: {e}")
            # Best-effort fallback: broadcast to local connections only
            await self._broadcast_locally(message, appointment_id, exclude_socket)

    async def _broadcast_locally(
        self, message: dict, appointment_id: str, exclude_socket: Optional[WebSocket]
    ):
        """Relays a message to all WebSockets connected to THIS server process."""
        if appointment_id not in self.active_connections:
            return

        dead_connections = []
        for connection in self.active_connections[appointment_id]:
            if connection != exclude_socket:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Dead connection detected in room {appointment_id}: {e}")
                    dead_connections.append(connection)

        # Cleanup identified dead connections
        for dead_conn in dead_connections:
            self.disconnect(dead_conn, appointment_id)

    async def subscribe_and_listen(self, appointment_id: str, websocket: WebSocket, user_id: str, connection_id: str):
        """
        Subscribes to a Redis channel and relays incoming messages to the specific WebSocket.
        Automatically filters out messages sent by the same connection.
        """
        pubsub = redis_client.pubsub()
        channel = f"telemetry:room:{appointment_id}"

        try:
            await pubsub.subscribe(channel)
            async for message in pubsub.listen():
                if message and message.get("type") == "message":
                    data = json.loads(message["data"])
                    # Filter out messages published by this specific connection
                    if data.get("sender_connection_id") != connection_id:
                        try:
                            await websocket.send_json(data)
                        except Exception:
                            break  # Connection probably closed
        except Exception as e:
            logger.error(f"Redis PubSub listener error for room {appointment_id}: {e}")
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()


manager = ConnectionManager()


async def get_ws_user(token: str, db: Session) -> Optional[User]:
    """
    Authenticates a user from a JWT token passed in the WebSocket handshake.
    """
    try:
        payload = decode_token(token)
        if not payload:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        import uuid

        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return None
        return db.get(User, user_uuid)
    except Exception as e:
        logger.error(f"WS auth error: {e}")
        return None


@router.websocket("/ws/{appointment_id}")
async def signaling_endpoint(
    websocket: WebSocket,
    appointment_id: str,
    token: str = Query(...),
    db: Session = Depends(deps.get_db),
):
    """
    Stateful WebSocket endpoint for WebRTC signaling.
    Relays WebRTC SDP offers/answers and ICE candidates across distributed workers via Redis.
    """
    # 1. Authentication
    user = await get_ws_user(token, db)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Authorization
    import uuid

    try:
        appt_uuid = uuid.UUID(appointment_id)
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    appointment = db.get(Appointment, appt_uuid)
    if not appointment:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Strict Identity Linkage: Check if user is the patient or the practitioner assigned
    is_practitioner = False
    if appointment.practitioner_id:
        from app.models import Practitioner

        practitioner = db.get(Practitioner, appointment.practitioner_id)
        if practitioner and practitioner.user_id == user.id:
            is_practitioner = True

    is_patient = False
    if appointment.patient_id:
        from app.models import Patient

        patient = db.get(Patient, appointment.patient_id)
        if patient and (patient.user_id == user.id or patient.created_by_user_id == user.id):
            is_patient = True

    if not is_practitioner and not is_patient:
        logger.warning(f"Unauthorized signaling attempt by {user.id} for appt {appointment_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 3. Connection and Lifecycle
    await manager.connect(websocket, appointment_id)
    user_id_str = str(user.id)
    connection_id = str(uuid.uuid4())

    # Start the background task to listen to Redis messages for this room
    listen_task = asyncio.create_task(
        manager.subscribe_and_listen(appointment_id, websocket, user_id_str, connection_id)
    )

    try:
        # Initial Welcome
        await websocket.send_json(
            {"type": "welcome", "message": "Joined signaling room", "user_id": user_id_str}
        )

        # Notify others via Redis
        await manager.publish_to_room(
            {
                "type": "peer_joined",
                "user_id": user_id_str,
                "role": user.default_role,
                "sender_id": user_id_str,
                "sender_connection_id": connection_id,
            },
            appointment_id,
            exclude_socket=websocket,
        )

        while True:
            # Relay client-to-client signals
            data = await websocket.receive_json()
            data["sender_id"] = user_id_str  # Stamp with sender for filtering
            data["sender_connection_id"] = connection_id # Stamp with unique connection for testing compatibility

            if data.get("type") == "network_status":
                logger.info(f"Signal quality report for {appointment_id}: {data.get('status')}")

            await manager.publish_to_room(data, appointment_id, exclude_socket=websocket)

    except WebSocketDisconnect:
        logger.info(f"Normal WS disconnect for user {user_id_str}")
    except Exception as e:
        logger.error(f"Unexpected WS error in room {appointment_id}: {e}")
    finally:
        # 4. Guaranteed Cleanup (fixes CodeRabbit lifecycle drift)
        listen_task.cancel()
        manager.disconnect(websocket, appointment_id)
        await manager.publish_to_room(
            {
                "type": "peer_left",
                "user_id": user_id_str,
                "sender_id": user_id_str,
                "sender_connection_id": connection_id,
            },
            appointment_id,
            exclude_socket=websocket,
        )
        try:
            await listen_task
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error while cleaning up Redis listener task for {appointment_id}: {e}")
