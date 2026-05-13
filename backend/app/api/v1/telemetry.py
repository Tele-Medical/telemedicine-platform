from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Dict, List, Any
import json
import logging

from app.api import deps
from app.core.security import decode_token
from app.models import User, Appointment

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Maps appointment_id -> list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, appointment_id: str):
        await websocket.accept()
        if appointment_id not in self.active_connections:
            self.active_connections[appointment_id] = []
        self.active_connections[appointment_id].append(websocket)

    def disconnect(self, websocket: WebSocket, appointment_id: str):
        if appointment_id in self.active_connections:
            self.active_connections[appointment_id].remove(websocket)
            if not self.active_connections[appointment_id]:
                del self.active_connections[appointment_id]

    async def broadcast_to_room(self, message: dict, appointment_id: str, sender: WebSocket):
        if appointment_id in self.active_connections:
            for connection in self.active_connections[appointment_id]:
                if connection != sender:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        # Stale connection, manager will handle in disconnect
                        pass

manager = ConnectionManager()

async def get_ws_user(token: str, db: Session) -> User:
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = db.get(User, user_id)
        return user
    except Exception:
        return None

@router.websocket("/ws/{appointment_id}")
async def signaling_endpoint(
    websocket: WebSocket,
    appointment_id: str,
    token: str = Query(...),
    db: Session = Depends(deps.get_db)
):
    # 1. Authenticate user
    user = await get_ws_user(token, db)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Authorize access to appointment
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Check if user is the assigned practitioner
    is_practitioner = False
    if appointment.practitioner_id:
        from app.models import Practitioner
        practitioner = db.get(Practitioner, appointment.practitioner_id)
        if practitioner and practitioner.user_id == user.id:
            is_practitioner = True

    # Check if user is the assigned patient
    # For MVP, we assume User.id == Patient.id if the patient has an account,
    # or we could match by phone. Let's stick to user.id == patient_id for now as a common pattern,
    # but also allow matching if the user's phone matches the patient's phone.
    is_patient = False
    if user.id == appointment.patient_id:
        is_patient = True
    else:
        from app.models import Patient
        patient = db.get(Patient, appointment.patient_id)
        if patient and patient.phone and patient.phone == user.phone:
            is_patient = True

    if not is_practitioner and not is_patient:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 3. Connect to room
    await manager.connect(websocket, appointment_id)
    
    # Send welcome message
    await websocket.send_json({"type": "welcome", "message": "Joined room", "user_id": str(user.id)})
    
    # Notify other participant
    await manager.broadcast_to_room(
        {"type": "peer_joined", "user_id": str(user.id), "role": user.default_role},
        appointment_id,
        sender=websocket
    )

    try:
        while True:
            # Relay WebRTC signals (offer, answer, ice-candidate, network_status)
            data = await websocket.receive_json()
            # Optional: Log network status for future analytics
            if data.get("type") == "network_status":
                logger.info(f"Network status in room {appointment_id} from {user.id}: {data.get('status')}")
            
            await manager.broadcast_to_room(data, appointment_id, sender=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, appointment_id)
        await manager.broadcast_to_room(
            {"type": "peer_left", "user_id": str(user.id)},
            appointment_id,
            sender=websocket
        )
    except Exception as e:
        logger.error(f"WebSocket error in room {appointment_id}: {e}")
        manager.disconnect(websocket, appointment_id)
