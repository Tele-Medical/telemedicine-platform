import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User
from app.models.practitioner import Practitioner
from app.core.security import create_access_token


def make_user(db: Session, phone: str = "+5550004444") -> User:
    user = User(phone=phone, is_active=True, default_role="doctor")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_practitioner(db: Session, full_name: str, user_id: uuid.UUID) -> Practitioner:
    practitioner = Practitioner(
        full_name=full_name,
        user_id=user_id,
        specialty="General Medicine",
        registration_number=f"MCI-{uuid.uuid4().hex[:6].upper()}",
    )
    db.add(practitioner)
    db.commit()
    db.refresh(practitioner)
    return practitioner


def auth_headers(user: User) -> dict:
    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}


def test_list_practitioners_success(client: TestClient, db_session: Session):
    user = make_user(db_session)
    make_practitioner(db_session, "Dr. Aman Deep", user.id)

    # Create another practitioner
    user2 = User(phone="+5550004445", is_active=True, default_role="doctor")
    db_session.add(user2)
    db_session.commit()
    make_practitioner(db_session, "Dr. Preet Kaur", user2.id)

    response = client.get("/api/v1/practitioners/", headers=auth_headers(user))
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    names = {p["full_name"] for p in data}
    assert "Dr. Aman Deep" in names
    assert "Dr. Preet Kaur" in names


def test_get_practitioner_success(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550004446")
    practitioner = make_practitioner(db_session, "Dr. Specific", user.id)

    response = client.get(f"/api/v1/practitioners/{practitioner.id}", headers=auth_headers(user))
    assert response.status_code == 200
    assert response.json()["full_name"] == "Dr. Specific"
    assert response.json()["specialty"] == "General Medicine"


def test_get_practitioner_not_found(client: TestClient, db_session: Session):
    user = make_user(db_session, phone="+5550004447")
    random_id = uuid.uuid4()
    response = client.get(f"/api/v1/practitioners/{random_id}", headers=auth_headers(user))
    assert response.status_code == 404


def test_list_practitioners_unauthenticated(client: TestClient):
    response = client.get("/api/v1/practitioners/")
    assert response.status_code == 401
