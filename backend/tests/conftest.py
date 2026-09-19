import os
import sys
import uuid
import pytest
import jwt
from datetime import datetime, timedelta, timezone

# Add backend directory to sys.path so app modules are resolvable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.config import settings
from app.core.security import get_current_user, AuthenticatedUser

# In-memory SQLite for high-speed isolated tests
TEST_DB_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

TEST_JWT_SECRET = "super-secret-test-key-32-chars-long-12345"
settings.SUPABASE_JWT_SECRET = TEST_JWT_SECRET


@pytest.fixture(autouse=True)
def init_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_id() -> uuid.UUID:
    return uuid.uuid4()


@pytest.fixture
def test_user_2_id() -> uuid.UUID:
    return uuid.uuid4()


def create_mock_jwt(user_id: uuid.UUID, expired: bool = False, wrong_secret: bool = False) -> str:
    """Helper to generate mock Supabase JWT tokens for testing."""
    secret = "wrong-secret-key" if wrong_secret else TEST_JWT_SECRET
    exp = datetime.now(timezone.utc) + (timedelta(hours=-1) if expired else timedelta(hours=1))
    payload = {
        "sub": str(user_id),
        "aud": "authenticated",
        "role": "authenticated",
        "email": "test@sidequest.dev",
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")
