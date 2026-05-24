import pytest
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketDisconnect

from app.models import User, Appointment, Patient, Practitioner
from app.core.security import create_access_token


@pytest.fixture
def test_data(db_session: Session):
    """
    Sets up mandatory signaling test data including a doctor, patient, and confirmed appt.
    """
    # Create doctor
    doctor_user = User(
        username="doctor_signaling",
        hashed_password="hashed",
        full_name="Dr. Signaling",
        default_role="doctor",
        is_active=True,
    )
    db_session.add(doctor_user)
    db_session.flush()

    practitioner = Practitioner(
        id=doctor_user.id, user_id=doctor_user.id, full_name="Dr. Signaling"
    )
    db_session.add(practitioner)

    # Create patient
    patient_user = User(
        username="patient_signaling",
        hashed_password="hashed",
        full_name="Patient Signaling",
        default_role="patient",
        is_active=True,
    )
    db_session.add(patient_user)
    db_session.flush()

    patient = Patient(
        id=patient_user.id, full_name="Patient Signaling", created_by_user_id=doctor_user.id
    )
    db_session.add(patient)
    db_session.flush()

    # Create appointment
    appointment = Appointment(
        patient_id=patient.id,
        practitioner_id=practitioner.id,
        status="confirmed",
        channel="telemedicine",
        scheduled_for=None,
        created_by_user_id=doctor_user.id,
    )
    db_session.add(appointment)
    db_session.flush()

    return {"doctor": doctor_user, "patient": patient_user, "appointment": appointment}


def test_signaling_room_access(test_data, client):
    """
    Verifies that an authorized practitioner can successfully establish a signaling connection.
    """
    doctor_token = create_access_token(str(test_data["doctor"].id))
    appointment_id = str(test_data["appointment"].id)

    # Connect doctor
    with client.websocket_connect(
        f"/api/v1/telemetry/ws/{appointment_id}?token={doctor_token}"
    ) as websocket:
        data = websocket.receive_json()
        assert data["type"] == "welcome"
        assert "Joined" in data["message"]


def test_signaling_message_relay(test_data, client):
    """
    Verifies that messages (WebRTC SDP/ICE) are correctly relayed between participants.
    """
    doctor_token = create_access_token(str(test_data["doctor"].id))
    patient_token = create_access_token(str(test_data["patient"].id))
    appointment_id = str(test_data["appointment"].id)

    # Connect doctor
    with client.websocket_connect(
        f"/api/v1/telemetry/ws/{appointment_id}?token={doctor_token}"
    ) as ws_doc:
        ws_doc.receive_json()  # welcome

        # Connect patient
        with client.websocket_connect(
            f"/api/v1/telemetry/ws/{appointment_id}?token={patient_token}"
        ) as ws_pat:
            ws_pat.receive_json()  # welcome

            # Doctor sends offer
            offer = {"type": "offer", "sdp": "v=0...", "sender_id": str(test_data["doctor"].id)}
            ws_doc.send_json(offer)

            # Patient should receive offer
            received = ws_pat.receive_json()
            assert received["type"] == "offer"
            assert received["sdp"] == "v=0..."


def test_signaling_unauthorized_close_code(test_data, db_session: Session, client):
    """
    Verifies that unauthorized users are disconnected with the 1008 (Policy Violation) code.
    """
    # Create another user NOT in the appointment
    other_user = User(
        username="other_signaling",
        hashed_password="hashed",
        full_name="Other",
        default_role="patient",
        is_active=True,
    )
    db_session.add(other_user)
    db_session.flush()

    other_token = create_access_token(str(other_user.id))
    appointment_id = str(test_data["appointment"].id)

    # FastApi/Starlette TestClient raises WebSocketDisconnect when server closes connection
    with pytest.raises(WebSocketDisconnect) as excinfo:
        with client.websocket_connect(f"/api/v1/telemetry/ws/{appointment_id}?token={other_token}"):
            pass

    # Assert specific close code (1008: Policy Violation)
    assert excinfo.value.code == 1008
