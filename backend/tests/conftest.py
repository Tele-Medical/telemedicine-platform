import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base
from app.api.deps import get_db
from app.core.config import settings

# Create a test database engine (using the main db but we will rollback)
# For better isolation, we could use a separate test DB, but for now we use transactions.
engine = create_engine(settings.database_url)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def setup_db():
    # In a real TDD setup, you might create/drop test db here
    Base.metadata.create_all(bind=engine)
    yield
    # Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(setup_db):
    """
    Creates a fresh sqlalchemy session for a test.
    Rolls back transaction after test to leave DB clean.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """
    Returns a FastAPI TestClient that overrides the get_db dependency
    to use our test session.
    """
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
