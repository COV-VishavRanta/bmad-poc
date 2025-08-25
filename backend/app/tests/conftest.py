"""
Test configuration and fixtures.

This module provides common test fixtures and configuration
for the test suite.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.client import Client, ClientType, ClientStatus
from app.services.user_service import UserService
from app.schemas.user import UserCreate
from app.utils.middleware import get_current_user, require_auth

# Test database configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


# Override the dependency
app.dependency_overrides[get_db] = override_get_db

# Mock authentication for testing
def override_require_auth():
    """Override authentication dependency for testing."""
    # Return a test HR user with appropriate permissions
    return User(
        id=1,
        email="test.hr@example.com",
        first_name="Test",
        last_name="HR",
        role="HR",
        is_active=True
    )

# Override authentication dependency
app.dependency_overrides[require_auth] = override_require_auth


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
    
    # Drop tables after test
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def demo_user_data():
    """Demo user data for testing."""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User",
        "role": "HR",
        "is_active": True
    }


@pytest.fixture
def created_user(db_session, demo_user_data):
    """Create a demo user for testing."""
    user_service = UserService(db_session)
    user_create = UserCreate(**demo_user_data)
    return user_service.create_user(user_create)


@pytest.fixture
def sample_hr_user(db_session):
    """Create a sample HR user for testing."""
    user = User(
        email="hr.test@example.com",
        password_hash="$2b$12$dummy_hash",
        first_name="HR",
        last_name="User",
        role="HR",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_pc_user(db_session):
    """Create a sample PC user for testing."""
    user = User(
        email="pc.test@example.com",
        password_hash="$2b$12$dummy_hash",
        first_name="PC",
        last_name="User",
        role="PC",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_client(db_session, sample_hr_user):
    """Create a sample client for testing."""
    client = Client(
        name="Test Client Corp",
        client_type=ClientType.CUSTOMER.value,
        status=ClientStatus.ACTIVE.value,
        relation_type="Direct Customer",
        project_mgmt_tool="Jira",
        comments="Test client for unit testing",
        created_by=sample_hr_user.id
    )
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    return client


@pytest.fixture
def sample_clients(db_session, sample_hr_user):
    """Create multiple sample clients for testing."""
    clients = []
    for i in range(5):
        client = Client(
            name=f"Test Client {i + 1}",
            client_type=ClientType.CUSTOMER.value,
            status=ClientStatus.ACTIVE.value,
            relation_type=f"Test Relation {i + 1}",
            comments=f"Test client {i + 1} for listing tests",
            created_by=sample_hr_user.id
        )
        db_session.add(client)
        clients.append(client)
    
    db_session.commit()
    for client in clients:
        db_session.refresh(client)
    return clients


@pytest.fixture
def auth_token(client, db_session, sample_hr_user):
    """Create an authentication token for testing."""
    # This would need to be implemented based on your auth system
    # For now, return a dummy token
    return "dummy_auth_token"


@pytest.fixture
def sample_client_id(sample_client):
    """Get the ID of a sample client."""
    return sample_client.id