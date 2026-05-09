import uuid
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.practitioner import Practitioner
from app.models.auth import User
from app.services import practitioner_service

def make_user(db: Session) -> User:
    user = User(phone=f"+555{uuid.uuid4().hex[:7]}", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_get_practitioner_service_not_found(db_session: Session):
    random_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        practitioner_service.get_practitioner(db_session, random_id)
    assert exc_info.value.status_code == 404


def test_list_practitioners_service(db_session: Session):
    # Setup
    u1 = make_user(db_session)
    u2 = make_user(db_session)
    p1 = Practitioner(full_name="Dr. A", user_id=u1.id, is_active=True)
    p2 = Practitioner(full_name="Dr. B", user_id=u2.id, is_active=True)
    db_session.add_all([p1, p2])
    db_session.commit()
    
    results = practitioner_service.list_practitioners(db_session)
    assert len(results) >= 2
