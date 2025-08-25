"""
Tests for authentication functionality.

This module contains tests for user authentication, session management,
and role-based access control.
"""

import pytest
from fastapi.testclient import TestClient

from app.models.user import User
from app.services.user_service import UserService
from app.schemas.user import UserCreate
from app.utils.auth import PasswordHash


class TestUserService:
    """Test cases for UserService."""

    def test_create_user(self, db_session):
        """Test user creation."""
        user_service = UserService(db_session)
        user_data = UserCreate(
            email="newuser@example.com",
            password="password123",
            first_name="New",
            last_name="User",
            role="PC"
        )
        
        user = user_service.create_user(user_data)
        
        assert user.id is not None
        assert user.email == "newuser@example.com"
        assert user.first_name == "New"
        assert user.last_name == "User"
        assert user.role == "PC"
        assert user.is_active is True
        assert user.full_name == "New User"

    def test_create_duplicate_user(self, db_session, created_user):
        """Test creating duplicate user raises error."""
        user_service = UserService(db_session)
        user_data = UserCreate(
            email=created_user.email,
            password="password123",
            first_name="Duplicate",
            last_name="User",
            role="RM"
        )
        
        with pytest.raises(Exception):  # UserAlreadyExistsError
            user_service.create_user(user_data)

    def test_authenticate_user_success(self, db_session, demo_user_data):
        """Test successful user authentication."""
        user_service = UserService(db_session)
        
        # Create user
        user_create = UserCreate(**demo_user_data)
        created_user = user_service.create_user(user_create)
        
        # Authenticate
        authenticated_user = user_service.authenticate_user(
            demo_user_data["email"], 
            demo_user_data["password"]
        )
        
        assert authenticated_user is not None
        assert authenticated_user.id == created_user.id
        assert authenticated_user.email == demo_user_data["email"]

    def test_authenticate_user_invalid_password(self, db_session, created_user):
        """Test authentication with invalid password."""
        user_service = UserService(db_session)
        
        authenticated_user = user_service.authenticate_user(
            created_user.email, 
            "wrongpassword"
        )
        
        assert authenticated_user is None

    def test_authenticate_user_invalid_email(self, db_session):
        """Test authentication with invalid email."""
        user_service = UserService(db_session)
        
        authenticated_user = user_service.authenticate_user(
            "nonexistent@example.com", 
            "password123"
        )
        
        assert authenticated_user is None

    def test_create_user_session(self, db_session, created_user):
        """Test user session creation."""
        user_service = UserService(db_session)
        
        session = user_service.create_user_session(created_user)
        
        assert session.id is not None
        assert session.user_id == created_user.id
        assert session.session_token is not None
        assert len(session.session_token) > 0
        assert session.expires_at is not None
        assert not session.is_expired

    def test_get_session_by_token(self, db_session, created_user):
        """Test getting session by token."""
        user_service = UserService(db_session)
        
        # Create session
        created_session = user_service.create_user_session(created_user)
        
        # Get session by token
        retrieved_session = user_service.get_session_by_token(created_session.session_token)
        
        assert retrieved_session is not None
        assert retrieved_session.id == created_session.id
        assert retrieved_session.user_id == created_user.id

    def test_invalidate_session(self, db_session, created_user):
        """Test session invalidation."""
        user_service = UserService(db_session)
        
        # Create session
        session = user_service.create_user_session(created_user)
        
        # Invalidate session
        result = user_service.invalidate_session(session.session_token)
        assert result is True
        
        # Try to get invalidated session
        retrieved_session = user_service.get_session_by_token(session.session_token)
        assert retrieved_session is None


class TestPasswordHash:
    """Test cases for password hashing utilities."""

    def test_hash_password(self):
        """Test password hashing."""
        password = "testpassword123"
        hashed = PasswordHash.hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert isinstance(hashed, str)

    def test_verify_password_success(self):
        """Test successful password verification."""
        password = "testpassword123"
        hashed = PasswordHash.hash_password(password)
        
        result = PasswordHash.verify_password(password, hashed)
        assert result is True

    def test_verify_password_failure(self):
        """Test failed password verification."""
        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = PasswordHash.hash_password(password)
        
        result = PasswordHash.verify_password(wrong_password, hashed)
        assert result is False


class TestUserModel:
    """Test cases for User model."""

    def test_user_full_name(self, created_user):
        """Test user full name property."""
        assert created_user.full_name == f"{created_user.first_name} {created_user.last_name}"

    def test_user_has_permission_hr(self, db_session):
        """Test HR user permissions."""
        user_service = UserService(db_session)
        user_data = UserCreate(
            email="hr@example.com",
            password="password123",
            first_name="HR",
            last_name="User",
            role="HR"
        )
        
        user = user_service.create_user(user_data)
        
        assert user.has_permission("manage_users") is True
        assert user.has_permission("view_all_projects") is True
        assert user.has_permission("manage_projects") is False

    def test_user_has_permission_pc(self, db_session):
        """Test PC user permissions."""
        user_service = UserService(db_session)
        user_data = UserCreate(
            email="pc@example.com",
            password="password123",
            first_name="PC",
            last_name="User",
            role="PC"
        )
        
        user = user_service.create_user(user_data)
        
        assert user.has_permission("manage_projects") is True
        assert user.has_permission("view_clients") is True
        assert user.has_permission("manage_users") is False

    def test_user_has_permission_rm(self, db_session):
        """Test RM user permissions."""
        user_service = UserService(db_session)
        user_data = UserCreate(
            email="rm@example.com",
            password="password123",
            first_name="RM",
            last_name="User",
            role="RM"
        )
        
        user = user_service.create_user(user_data)
        
        assert user.has_permission("manage_resource_allocations") is True
        assert user.has_permission("view_project_timelines") is True
        assert user.has_permission("manage_users") is False