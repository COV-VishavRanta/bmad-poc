"""
Tests for authentication API endpoints.

This module contains integration tests for the authentication API,
including login, logout, and session management endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from app.services.user_service import UserService
from app.schemas.user import UserCreate


class TestAuthAPI:
    """Test cases for authentication API endpoints."""

    def test_login_success(self, client: TestClient, db_session, demo_user_data):
        """Test successful login."""
        # Create user first
        user_service = UserService(db_session)
        user_create = UserCreate(**demo_user_data)
        user_service.create_user(user_create)
        
        # Test login
        response = client.post("/auth/login", json={
            "email": demo_user_data["email"],
            "password": demo_user_data["password"]
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        assert data["user"]["email"] == demo_user_data["email"]
        assert data["user"]["first_name"] == demo_user_data["first_name"]
        assert data["user"]["last_name"] == demo_user_data["last_name"]
        assert data["user"]["role"] == demo_user_data["role"]
        assert data["message"] == "Login successful"
        
        # Check that session cookie is set
        assert "session_token" in response.cookies

    def test_login_invalid_credentials(self, client: TestClient, db_session, demo_user_data):
        """Test login with invalid credentials."""
        # Create user first
        user_service = UserService(db_session)
        user_create = UserCreate(**demo_user_data)
        user_service.create_user(user_create)
        
        # Test login with wrong password
        response = client.post("/auth/login", json={
            "email": demo_user_data["email"],
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "Invalid email or password" in data["detail"]

    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with nonexistent user."""
        response = client.post("/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "password123"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "Invalid email or password" in data["detail"]

    def test_logout_success(self, client: TestClient, db_session, demo_user_data):
        """Test successful logout."""
        # Create user and login first
        user_service = UserService(db_session)
        user_create = UserCreate(**demo_user_data)
        user_service.create_user(user_create)
        
        # Login
        login_response = client.post("/auth/login", json={
            "email": demo_user_data["email"],
            "password": demo_user_data["password"]
        })
        assert login_response.status_code == 200
        
        # Logout
        logout_response = client.post("/auth/logout")
        assert logout_response.status_code == 200
        
        data = logout_response.json()
        assert data["message"] == "Logout successful"

    def test_logout_without_session(self, client: TestClient):
        """Test logout without active session."""
        response = client.post("/auth/logout")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Logout successful"

    def test_auth_status_authenticated(self, client: TestClient, db_session, demo_user_data):
        """Test auth status for authenticated user."""
        # Create user and login first
        user_service = UserService(db_session)
        user_create = UserCreate(**demo_user_data)
        user_service.create_user(user_create)
        
        # Login
        login_response = client.post("/auth/login", json={
            "email": demo_user_data["email"],
            "password": demo_user_data["password"]
        })
        assert login_response.status_code == 200
        
        # Check auth status
        status_response = client.get("/auth/status")
        assert status_response.status_code == 200
        
        data = status_response.json()
        assert data["authenticated"] is True
        assert data["user"] is not None
        assert data["user"]["email"] == demo_user_data["email"]

    def test_auth_status_unauthenticated(self, client: TestClient):
        """Test auth status for unauthenticated user."""
        response = client.get("/auth/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["authenticated"] is False
        assert data["user"] is None

    def test_session_persistence(self, client: TestClient, db_session, demo_user_data):
        """Test that session persists across requests."""
        # Create user and login
        user_service = UserService(db_session)
        user_create = UserCreate(**demo_user_data)
        user_service.create_user(user_create)
        
        # Login
        login_response = client.post("/auth/login", json={
            "email": demo_user_data["email"],
            "password": demo_user_data["password"]
        })
        assert login_response.status_code == 200
        
        # Make another request using the same client (with cookies)
        status_response = client.get("/auth/status")
        assert status_response.status_code == 200
        
        data = status_response.json()
        assert data["authenticated"] is True
        assert data["user"]["email"] == demo_user_data["email"]