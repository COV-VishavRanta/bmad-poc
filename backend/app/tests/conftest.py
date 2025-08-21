"""
Test configuration and fixtures for the test suite.

This module provides pytest configuration, database fixtures,
and common test utilities for the ClientOps application.
"""

import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.base import Base
from app.models.user import User, UserSession, UserRole, UserStatus
from app.utils.security import hash_password, generate_session_id
from app.middleware import require_auth


# Test database URL (SQLite in memory)
TEST_DATABASE_URL = "sqlite:///./test.db"

# Create test engine and session
test_engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    # Create tables
    Base.metadata.create_all(bind=test_engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database override."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_hr_user(db_session):
    """Create a test HR user in the database."""
    user = User(
        email="hr@example.com",
        password_hash=hash_password("TestPass123!"),
        full_name="HR User",
        role=UserRole.HR,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_user(db_session):
    """Create a test user in the database."""
    user = User(
        email="test@example.com",
        password_hash=hash_password("TestPass123!"),
        full_name="Test User",
        role=UserRole.PC,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_pc_user(db_session):
    """Create a test PC user in the database."""
    user = User(
        email="pc@example.com",
        password_hash=hash_password("TestPass123!"),
        full_name="PC User",
        role=UserRole.PC,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_rm_user(db_session):
    """Create a test RM user in the database."""
    user = User(
        email="rm@example.com",
        password_hash=hash_password("TestPass123!"),
        full_name="RM User",
        role=UserRole.RM,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def inactive_user(db_session):
    """Create an inactive test user in the database."""
    user = User(
        email="inactive@example.com",
        password_hash=hash_password("TestPass123!"),
        full_name="Inactive User",
        role=UserRole.HR,
        status=UserStatus.INACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_session(db_session, test_user):
    """Create a test session for a user."""
    session = UserSession(
        session_id=generate_session_id(),
        user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        ip_address="127.0.0.1",
        user_agent="Test User Agent",
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


@pytest.fixture
def expired_session(db_session, test_user):
    """Create an expired test session for a user."""
    session = UserSession(
        session_id=generate_session_id(),
        user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),  # Expired 1 hour ago
        ip_address="127.0.0.1",
        user_agent="Test User Agent",
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


@pytest.fixture
def authenticated_client(client, test_user, test_session):
    """Create an authenticated test client with session cookie."""
    client.cookies.set("clientops_session", test_session.session_id)
    return client


@pytest.fixture
def test_db(db_session):
    """Alias for db_session for cleaner test code."""
    return db_session


@pytest.fixture
def hr_session(db_session, test_hr_user):
    """Create a test session for HR user."""
    session = UserSession(
        session_id=generate_session_id(),
        user_id=test_hr_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        ip_address="127.0.0.1",
        user_agent="Test User Agent",
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


@pytest.fixture
def pc_session(db_session, test_pc_user):
    """Create a test session for PC user."""
    session = UserSession(
        session_id=generate_session_id(),
        user_id=test_pc_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        ip_address="127.0.0.1",
        user_agent="Test User Agent",
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


@pytest.fixture
def hr_client(client, test_hr_user, hr_session):
    """Create an authenticated client for HR user."""
    # Override the require_auth dependency to return the test HR user
    app.dependency_overrides[require_auth] = lambda: test_hr_user
    client.cookies.set("clientops_session", hr_session.session_id)
    yield client
    # Clean up the override
    app.dependency_overrides.pop(require_auth, None)


@pytest.fixture
def pc_client(client, test_pc_user, pc_session):
    """Create an authenticated client for PC user."""
    # Override the require_auth dependency to return the test PC user
    app.dependency_overrides[require_auth] = lambda: test_pc_user
    client.cookies.set("clientops_session", pc_session.session_id)
    yield client
    # Clean up the override
    app.dependency_overrides.pop(require_auth, None)