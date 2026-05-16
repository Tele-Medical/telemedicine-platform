from unittest.mock import MagicMock, AsyncMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app as fastapi_app
from app.core.database import Base
from app.api.deps import get_db
from app.core.config import settings
import app.core.redis
import app.api.v1.telemetry

# Create a test database engine (using the main db but we will rollback)
# For better isolation, we could use a separate test DB, but for now we use transactions.
engine = create_engine(settings.database_url)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Mock Redis
@pytest.fixture(autouse=True)
def mock_redis(monkeypatch):
    """
    Globally mocks the redis_client to prevent tests from requiring a live Redis server.
    Mocks both standard commands (publish) and Pub/Sub mechanics.
    Targeting both core and module-bound references.
    """
    mock = MagicMock()
    # Force publish to raise an exception so the signaling server falls back
    # to local broadcast, allowing the WebSocket tests to receive messages.
    mock.publish = AsyncMock(side_effect=Exception("Forcing local broadcast fallback for tests"))
    
    # Mock PubSub lifecycle
    mock_pubsub = AsyncMock()
    mock_pubsub.subscribe = AsyncMock()
    mock_pubsub.unsubscribe = AsyncMock()
    mock_pubsub.get_message = AsyncMock(return_value=None)
    mock_pubsub.aclose = AsyncMock()
    
    mock.pubsub.return_value = mock_pubsub
    
    # Patch all known references
    monkeypatch.setattr(app.core.redis, "redis_client", mock)
    monkeypatch.setattr(app.api.v1.telemetry, "redis_client", mock)
    
    return mock

@pytest.fixture(autouse=True)
def force_mock_sms_provider():
    original_provider = settings.sms_provider
    settings.sms_provider = "mock"
    yield
    settings.sms_provider = original_provider

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

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()
