"""
Tests for user management API endpoints.

This module contains comprehensive tests for user management API endpoints
including authentication, authorization, CRUD operations, and error handling.
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.models.user import User, UserRole, UserStatus
from app.schemas.user import UserCreateRequest


class TestUserAPI:
    """Test cases for User Management API endpoints."""

    def test_list_users_success(self, hr_client: TestClient):
        """Test successful user listing by HR user."""
        response = hr_client.get("/api/users")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "users" in data
        assert "pagination" in data
        assert isinstance(data["users"], list)
        assert data["pagination"]["page"] == 1

    def test_list_users_unauthorized_user(self, pc_client: TestClient):
        """Test user listing fails for non-HR user."""
        response = pc_client.get("/api/users")
        
        assert response.status_code == 403
        data = response.json()
        assert data["error"]["message"]["status"] == "error"
        assert "HR role required" in data["error"]["message"]["message"]

    def test_list_users_unauthenticated(self, client: TestClient):
        """Test user listing fails for unauthenticated user."""
        response = client.get("/api/users")
        
        assert response.status_code == 401

    def test_list_users_with_search(self, hr_client: TestClient):
        """Test user listing with search parameter."""
        response = client.get(
            "/api/users",
            params={"search": "test"},
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    def test_list_users_with_filters(self, hr_client: TestClient):
        """Test user listing with role and status filters."""
        response = client.get(
            "/api/users",
            params={
                "role": "HR",
                "status": "active",
                "page_size": "5"
            },
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["pagination"]["page_size"] == 5

    def test_list_users_with_sorting(self, hr_client: TestClient):
        """Test user listing with sorting parameters."""
        response = client.get(
            "/api/users",
            params={
                "sort_by": "full_name",
                "sort_order": "asc"
            },
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    def test_list_users_invalid_sort_field(self, hr_client: TestClient):
        """Test user listing with invalid sort field."""
        response = client.get(
            "/api/users",
            params={"sort_by": "invalid_field"},
            headers=auth_headers_hr
        )
        
        assert response.status_code == 422  # Validation error

    def test_create_user_success(self, hr_client: TestClient):
        """Test successful user creation by HR user."""
        user_data = {
            "email": "newuser@example.com",
            "full_name": "New Test User",
            "role": "PC",
            "phone": "+1-555-0123",
            "department": "Engineering",
            "hire_date": "2025-08-21T00:00:00Z"
        }
        
        response = client.post(
            "/api/users",
            json=user_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["user"]["email"] == user_data["email"]
        assert data["user"]["full_name"] == user_data["full_name"]
        assert data["user"]["role"] == user_data["role"]
        assert "temporary_password" in data
        assert len(data["temporary_password"]) >= 8

    def test_create_user_unauthorized(self, pc_client: TestClient):
        """Test user creation fails for non-HR user."""
        user_data = {
            "email": "newuser@example.com",
            "full_name": "New Test User",
            "role": "PC"
        }
        
        response = client.post(
            "/api/users",
            json=user_data,
            headers=auth_headers_pc
        )
        
        assert response.status_code == 403

    def test_create_user_duplicate_email(self, hr_client: TestClient, test_user: User):
        """Test user creation fails with duplicate email."""
        user_data = {
            "email": test_user.email,  # Use existing email
            "full_name": "Another User",
            "role": "RM"
        }
        
        response = client.post(
            "/api/users",
            json=user_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 409
        data = response.json()
        assert data["detail"]["status"] == "error"
        assert "already exists" in data["detail"]["message"]

    def test_create_user_invalid_data(self, hr_client: TestClient):
        """Test user creation fails with invalid data."""
        user_data = {
            "email": "invalid-email",  # Invalid email format
            "full_name": "",  # Empty name
            "role": "INVALID_ROLE"  # Invalid role
        }
        
        response = client.post(
            "/api/users",
            json=user_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 422  # Validation error

    def test_get_user_success(self, hr_client: TestClient, test_user: User):
        """Test successful user retrieval by HR user."""
        response = client.get(
            f"/api/users/{test_user.id}",
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name

    def test_get_user_not_found(self, hr_client: TestClient):
        """Test user retrieval with non-existent ID."""
        response = client.get(
            "/api/users/99999",
            headers=auth_headers_hr
        )
        
        assert response.status_code == 404
        data = response.json()
        assert data["detail"]["status"] == "error"
        assert "not found" in data["detail"]["message"]

    def test_get_user_unauthorized(self, pc_client: TestClient, test_user: User):
        """Test user retrieval fails for non-HR user."""
        response = client.get(
            f"/api/users/{test_user.id}",
            headers=auth_headers_pc
        )
        
        assert response.status_code == 403

    def test_update_user_success(self, hr_client: TestClient, test_user: User):
        """Test successful user update by HR user."""
        update_data = {
            "full_name": "Updated User Name",
            "phone": "+1-555-9999",
            "department": "Product Management"
        }
        
        response = client.put(
            f"/api/users/{test_user.id}",
            json=update_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["user"]["full_name"] == update_data["full_name"]
        assert data["user"]["phone"] == update_data["phone"]
        assert data["user"]["department"] == update_data["department"]

    def test_update_user_not_found(self, hr_client: TestClient):
        """Test user update with non-existent ID."""
        update_data = {
            "full_name": "Updated Name"
        }
        
        response = client.put(
            "/api/users/99999",
            json=update_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 404

    def test_update_user_unauthorized(self, pc_client: TestClient, test_user: User):
        """Test user update fails for non-HR user."""
        update_data = {
            "full_name": "Updated Name"
        }
        
        response = client.put(
            f"/api/users/{test_user.id}",
            json=update_data,
            headers=auth_headers_pc
        )
        
        assert response.status_code == 403

    def test_deactivate_user_success(self, hr_client: TestClient, test_user: User):
        """Test successful user deactivation by HR user."""
        with patch('app.services.auth_service.AuthService.logout_all_user_sessions'):
            response = client.delete(
                f"/api/users/{test_user.id}",
                headers=auth_headers_hr
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    def test_deactivate_user_not_found(self, hr_client: TestClient):
        """Test user deactivation with non-existent ID."""
        response = client.delete(
            "/api/users/99999",
            headers=auth_headers_hr
        )
        
        assert response.status_code == 404

    def test_deactivate_user_unauthorized(self, pc_client: TestClient, test_user: User):
        """Test user deactivation fails for non-HR user."""
        response = client.delete(
            f"/api/users/{test_user.id}",
            headers=auth_headers_pc
        )
        
        assert response.status_code == 403

    def test_change_user_role_success(self, hr_client: TestClient, test_user: User):
        """Test successful user role change by HR user."""
        role_data = {
            "role": "RM"
        }
        
        response = client.put(
            f"/api/users/{test_user.id}/role",
            json=role_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["user"]["role"] == role_data["role"]

    def test_change_user_role_invalid_role(self, hr_client: TestClient, test_user: User):
        """Test user role change with invalid role."""
        role_data = {
            "role": "INVALID_ROLE"
        }
        
        response = client.put(
            f"/api/users/{test_user.id}/role",
            json=role_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 422  # Validation error

    def test_change_user_role_unauthorized(self, pc_client: TestClient, test_user: User):
        """Test user role change fails for non-HR user."""
        role_data = {
            "role": "HR"
        }
        
        response = client.put(
            f"/api/users/{test_user.id}/role",
            json=role_data,
            headers=auth_headers_pc
        )
        
        assert response.status_code == 403

    def test_change_user_status_success(self, hr_client: TestClient, test_user: User):
        """Test successful user status change by HR user."""
        status_data = {
            "status": "inactive"
        }
        
        with patch('app.services.auth_service.AuthService.logout_all_user_sessions'):
            response = client.put(
                f"/api/users/{test_user.id}/status",
                json=status_data,
                headers=auth_headers_hr
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["user"]["status"] == status_data["status"]

    def test_change_user_status_unauthorized(self, pc_client: TestClient, test_user: User):
        """Test user status change fails for non-HR user."""
        status_data = {
            "status": "inactive"
        }
        
        response = client.put(
            f"/api/users/{test_user.id}/status",
            json=status_data,
            headers=auth_headers_pc
        )
        
        assert response.status_code == 403

    def test_get_user_history_success(self, hr_client: TestClient, test_user: User):
        """Test successful user history retrieval by HR user."""
        response = client.get(
            f"/api/users/{test_user.id}/history",
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "history" in data
        assert isinstance(data["history"], list)

    def test_get_user_history_not_found(self, hr_client: TestClient):
        """Test user history retrieval with non-existent user."""
        response = client.get(
            "/api/users/99999/history",
            headers=auth_headers_hr
        )
        
        assert response.status_code == 404

    def test_get_user_history_unauthorized(self, pc_client: TestClient, test_user: User):
        """Test user history retrieval fails for non-HR user."""
        response = client.get(
            f"/api/users/{test_user.id}/history",
            headers=auth_headers_pc
        )
        
        assert response.status_code == 403

    def test_bulk_user_operations_activate(self, hr_client: TestClient, test_user: User):
        """Test bulk user activation operation."""
        bulk_data = {
            "user_ids": [test_user.id],
            "operation": "activate"
        }
        
        response = client.post(
            "/api/users/bulk",
            json=bulk_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["success_count"] >= 0
        assert data["failure_count"] >= 0
        assert len(data["results"]) == len(bulk_data["user_ids"])

    def test_bulk_user_operations_change_role(self, hr_client: TestClient, test_user: User):
        """Test bulk user role change operation."""
        bulk_data = {
            "user_ids": [test_user.id],
            "operation": "change_role",
            "new_role": "RM"
        }
        
        response = client.post(
            "/api/users/bulk",
            json=bulk_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    def test_bulk_user_operations_invalid_operation(self, hr_client: TestClient, test_user: User):
        """Test bulk operation with invalid operation type."""
        bulk_data = {
            "user_ids": [test_user.id],
            "operation": "invalid_operation"
        }
        
        response = client.post(
            "/api/users/bulk",
            json=bulk_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 422  # Validation error

    def test_bulk_user_operations_empty_user_list(self, hr_client: TestClient):
        """Test bulk operation with empty user list."""
        bulk_data = {
            "user_ids": [],
            "operation": "activate"
        }
        
        response = client.post(
            "/api/users/bulk",
            json=bulk_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 422  # Validation error

    def test_bulk_user_operations_unauthorized(self, pc_client: TestClient, test_user: User):
        """Test bulk operations fail for non-HR user."""
        bulk_data = {
            "user_ids": [test_user.id],
            "operation": "activate"
        }
        
        response = client.post(
            "/api/users/bulk",
            json=bulk_data,
            headers=auth_headers_pc
        )
        
        assert response.status_code == 403

    def test_bulk_user_operations_password_reset(self, hr_client: TestClient, test_user: User):
        """Test bulk password reset operation."""
        bulk_data = {
            "user_ids": [test_user.id],
            "operation": "reset_password"
        }
        
        response = client.post(
            "/api/users/bulk",
            json=bulk_data,
            headers=auth_headers_hr
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        # Check that password is included in success message
        if data["success_count"] > 0:
            success_result = next(r for r in data["results"] if r["success"])
            assert "New password:" in success_result["message"]