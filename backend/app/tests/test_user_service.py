"""
Tests for user management service.

This module contains comprehensive tests for UserService including
CRUD operations, role management, status changes, audit trails,
and error handling scenarios.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import patch

from sqlalchemy.orm import Session

from app.models.user import User, UserRole, UserStatus
from app.models.user_history import UserHistory
from app.schemas.user import UserCreateRequest, UserUpdateRequest, UserSearchParams
from app.services.user_service import (
    UserService,
    UserNotFoundError,
    UserAlreadyExistsError,
    PermissionDeniedError,
)


class TestUserService:
    """Test cases for UserService."""

    def setup_method(self):
        """Set up test data for each test method."""
        self.user_data = UserCreateRequest(
            email="test.user@example.com",
            full_name="Test User",
            role=UserRole.PC,
            phone="+1-555-0123",
            department="Engineering",
            hire_date=datetime(2025, 8, 21),
        )

    def test_create_user_success(self, test_db: Session, test_hr_user: User):
        """Test successful user creation."""
        service = UserService(test_db)
        
        user, temp_password = service.create_user(
            user_data=self.user_data,
            created_by=test_hr_user.id,
            ip_address="192.168.1.100",
            user_agent="Test Agent",
        )

        assert user.email == self.user_data.email
        assert user.full_name == self.user_data.full_name
        assert user.role.value == self.user_data.role  # Compare enum value to string
        assert user.status == UserStatus.ACTIVE
        assert user.phone == self.user_data.phone
        assert user.department == self.user_data.department
        assert user.hire_date == self.user_data.hire_date
        assert len(temp_password) >= 8

        # Verify audit history was created
        history = test_db.query(UserHistory).filter(
            UserHistory.user_id == user.id
        ).first()
        assert history is not None
        assert history.action == "created"
        assert history.changed_by == test_hr_user.id

    def test_create_user_duplicate_email(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test user creation with duplicate email fails."""
        service = UserService(test_db)
        
        duplicate_data = UserCreateRequest(
            email=test_user.email,  # Use existing user's email
            full_name="Another User",
            role=UserRole.RM,
        )

        with pytest.raises(UserAlreadyExistsError) as exc_info:
            service.create_user(
                user_data=duplicate_data,
                created_by=test_hr_user.id,
            )
        
        assert "already exists" in str(exc_info.value)

    def test_get_user_by_id_success(self, test_db: Session, test_user: User):
        """Test successful user retrieval by ID."""
        service = UserService(test_db)
        
        retrieved_user = service.get_user_by_id(test_user.id)
        
        assert retrieved_user.id == test_user.id
        assert retrieved_user.email == test_user.email

    def test_get_user_by_id_not_found(self, test_db: Session):
        """Test user retrieval with non-existent ID fails."""
        service = UserService(test_db)
        
        with pytest.raises(UserNotFoundError):
            service.get_user_by_id(99999)

    def test_update_user_success(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test successful user update."""
        service = UserService(test_db)
        
        update_data = UserUpdateRequest(
            full_name="Updated Name",
            phone="+1-555-9999",
            department="Product",
            hire_date=datetime(2025, 1, 1),
        )

        updated_user = service.update_user(
            user_id=test_user.id,
            user_data=update_data,
            updated_by=test_hr_user.id,
            ip_address="192.168.1.100",
        )

        assert updated_user.full_name == update_data.full_name
        assert updated_user.phone == update_data.phone
        assert updated_user.department == update_data.department
        assert updated_user.hire_date == update_data.hire_date

        # Verify audit history was created
        history = test_db.query(UserHistory).filter(
            UserHistory.user_id == test_user.id,
            UserHistory.action == "updated"
        ).first()
        assert history is not None
        assert "full_name" in history.changed_fields

    def test_update_user_no_changes(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test user update with no actual changes."""
        service = UserService(test_db)
        
        # Update with same values
        update_data = UserUpdateRequest(
            full_name=test_user.full_name,
        )

        updated_user = service.update_user(
            user_id=test_user.id,
            user_data=update_data,
            updated_by=test_hr_user.id,
        )

        assert updated_user.full_name == test_user.full_name

        # No audit history should be created for no changes
        history_count = test_db.query(UserHistory).filter(
            UserHistory.user_id == test_user.id,
            UserHistory.action == "updated"
        ).count()
        assert history_count == 0

    def test_change_user_role_success(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test successful user role change."""
        service = UserService(test_db)
        original_role = test_user.role
        new_role = UserRole.HR

        updated_user = service.change_user_role(
            user_id=test_user.id,
            new_role=new_role,
            changed_by=test_hr_user.id,
            ip_address="192.168.1.100",
        )

        assert updated_user.role == new_role

        # Verify audit history was created
        history = test_db.query(UserHistory).filter(
            UserHistory.user_id == test_user.id,
            UserHistory.action == "role_changed"
        ).first()
        assert history is not None
        assert history.old_values["role"] == original_role.value
        assert history.new_values["role"] == new_role.value

    def test_change_user_role_same_role(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test user role change to same role (no-op)."""
        service = UserService(test_db)
        original_role = test_user.role

        updated_user = service.change_user_role(
            user_id=test_user.id,
            new_role=original_role,
            changed_by=test_hr_user.id,
        )

        assert updated_user.role == original_role

        # No audit history should be created for no change
        history_count = test_db.query(UserHistory).filter(
            UserHistory.user_id == test_user.id,
            UserHistory.action == "role_changed"
        ).count()
        assert history_count == 0

    def test_change_user_role_self_modification(self, test_db: Session, test_user: User):
        """Test user cannot change their own role."""
        service = UserService(test_db)

        with pytest.raises(PermissionDeniedError) as exc_info:
            service.change_user_role(
                user_id=test_user.id,
                new_role=UserRole.HR,
                changed_by=test_user.id,  # Same user
            )
        
        assert "cannot modify their own role" in str(exc_info.value)

    def test_change_user_status_success(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test successful user status change."""
        service = UserService(test_db)
        original_status = test_user.status
        new_status = UserStatus.INACTIVE

        with patch('app.services.auth_service.AuthService.logout_all_user_sessions') as mock_logout:
            updated_user = service.change_user_status(
                user_id=test_user.id,
                new_status=new_status,
                changed_by=test_hr_user.id,
                ip_address="192.168.1.100",
            )

        assert updated_user.status == new_status
        mock_logout.assert_called_once_with(test_user.id)

        # Verify audit history was created
        history = test_db.query(UserHistory).filter(
            UserHistory.user_id == test_user.id,
            UserHistory.action == "deactivated"
        ).first()
        assert history is not None

    def test_change_user_status_self_deactivation(self, test_db: Session, test_user: User):
        """Test user cannot deactivate their own account."""
        service = UserService(test_db)

        with pytest.raises(PermissionDeniedError) as exc_info:
            service.change_user_status(
                user_id=test_user.id,
                new_status=UserStatus.INACTIVE,
                changed_by=test_user.id,  # Same user
            )
        
        assert "cannot deactivate their own account" in str(exc_info.value)

    def test_deactivate_user_success(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test successful user deactivation."""
        service = UserService(test_db)

        with patch('app.services.auth_service.AuthService.logout_all_user_sessions') as mock_logout:
            service.deactivate_user(
                user_id=test_user.id,
                deactivated_by=test_hr_user.id,
                ip_address="192.168.1.100",
            )

        # Reload user from database
        test_db.refresh(test_user)
        assert test_user.status == UserStatus.INACTIVE
        mock_logout.assert_called_once_with(test_user.id)

    def test_search_users_basic(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test basic user search functionality."""
        service = UserService(test_db)
        
        search_params = UserSearchParams(
            page=1,
            page_size=10,
        )

        users, pagination = service.search_users(search_params)

        assert len(users) >= 2  # At least our test users
        assert pagination["page"] == 1
        assert pagination["page_size"] == 10
        assert pagination["total_items"] >= 2

    def test_search_users_by_name(self, test_db: Session, test_user: User):
        """Test user search by name."""
        service = UserService(test_db)
        
        search_params = UserSearchParams(
            search=test_user.full_name[:5],  # First 5 characters
            page=1,
            page_size=10,
        )

        users, pagination = service.search_users(search_params)

        assert len(users) >= 1
        assert any(user.id == test_user.id for user in users)

    def test_search_users_by_role(self, test_db: Session, test_user: User):
        """Test user search by role filter."""
        service = UserService(test_db)
        
        search_params = UserSearchParams(
            role=test_user.role,
            page=1,
            page_size=10,
        )

        users, pagination = service.search_users(search_params)

        assert len(users) >= 1
        assert all(user.role.value == test_user.role.value for user in users)

    def test_search_users_by_status(self, test_db: Session, test_user: User):
        """Test user search by status filter."""
        service = UserService(test_db)
        
        search_params = UserSearchParams(
            status=UserStatus.ACTIVE,
            page=1,
            page_size=10,
        )

        users, pagination = service.search_users(search_params)

        assert len(users) >= 1
        assert all(user.status == UserStatus.ACTIVE for user in users)

    def test_search_users_sorting(self, test_db: Session):
        """Test user search with sorting."""
        service = UserService(test_db)
        
        # Test ascending sort by name
        search_params = UserSearchParams(
            sort_by="full_name",
            sort_order="asc",
            page=1,
            page_size=10,
        )

        users, _ = service.search_users(search_params)
        
        if len(users) > 1:
            # Check that names are in ascending order
            names = [user.full_name for user in users]
            assert names == sorted(names)

    def test_search_users_pagination(self, test_db: Session):
        """Test user search pagination."""
        service = UserService(test_db)
        
        # Test page 1
        search_params = UserSearchParams(
            page=1,
            page_size=1,  # One user per page
        )

        users_page1, pagination = service.search_users(search_params)

        # Should have at least some results or handle empty case gracefully
        assert isinstance(users_page1, list)
        assert pagination["page"] == 1
        assert pagination["page_size"] == 1
        
        if pagination["total_items"] > 0:
            assert len(users_page1) <= 1  # Should be 0 or 1
            
            if pagination["total_items"] > 1:
                assert pagination["has_next"] is True
                assert pagination["has_previous"] is False
            else:
                assert pagination["has_next"] is False
                assert pagination["has_previous"] is False

    def test_get_user_history(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test getting user audit history."""
        service = UserService(test_db)

        # Create some history by updating the user
        service.update_user(
            user_id=test_user.id,
            user_data=UserUpdateRequest(full_name="Updated Name"),
            updated_by=test_hr_user.id,
        )

        history = service.get_user_history(test_user.id)

        assert len(history) >= 1
        assert any(entry.action == "updated" for entry in history)
        assert all(entry.user_id == test_user.id for entry in history)

    def test_get_user_history_not_found(self, test_db: Session):
        """Test getting history for non-existent user fails."""
        service = UserService(test_db)

        with pytest.raises(UserNotFoundError):
            service.get_user_history(99999)

    def test_bulk_user_operation_activate(self, test_db: Session, test_hr_user: User):
        """Test bulk user activation operation."""
        service = UserService(test_db)

        # Create an inactive user
        inactive_user, _ = service.create_user(
            user_data=UserCreateRequest(
                email="inactive@example.com",
                full_name="Inactive User",
                role=UserRole.PC,
            ),
            created_by=test_hr_user.id,
        )
        service.change_user_status(
            user_id=inactive_user.id,
            new_status=UserStatus.INACTIVE,
            changed_by=test_hr_user.id,
        )

        # Bulk activate
        result = service.bulk_user_operation(
            user_ids=[inactive_user.id],
            operation="activate",
            performed_by=test_hr_user.id,
        )

        assert result["success_count"] == 1
        assert result["failure_count"] == 0

        # Check user is now active
        test_db.refresh(inactive_user)
        assert inactive_user.status == UserStatus.ACTIVE

    def test_bulk_user_operation_role_change(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test bulk user role change operation."""
        service = UserService(test_db)

        result = service.bulk_user_operation(
            user_ids=[test_user.id],
            operation="change_role",
            performed_by=test_hr_user.id,
            new_role=UserRole.RM,
        )

        assert result["success_count"] == 1
        assert result["failure_count"] == 0

        # Check user role changed
        test_db.refresh(test_user)
        assert test_user.role.value == UserRole.RM.value

    def test_bulk_user_operation_partial_failure(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test bulk operation with some failures."""
        service = UserService(test_db)

        # Include a non-existent user ID
        result = service.bulk_user_operation(
            user_ids=[test_user.id, 99999],
            operation="activate",
            performed_by=test_hr_user.id,
        )

        assert result["success_count"] == 1
        assert result["failure_count"] == 1
        assert len(result["results"]) == 2

        # Check individual results
        success_result = next(r for r in result["results"] if r["success"])
        failure_result = next(r for r in result["results"] if not r["success"])
        
        assert success_result["user_id"] == test_user.id
        assert failure_result["user_id"] == 99999

    def test_bulk_user_operation_invalid_operation(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test bulk operation with invalid operation type."""
        service = UserService(test_db)

        result = service.bulk_user_operation(
            user_ids=[test_user.id],
            operation="invalid_operation",
            performed_by=test_hr_user.id,
        )

        assert result["success_count"] == 0
        assert result["failure_count"] == 1
        assert "Unknown operation" in result["results"][0]["message"]

    def test_bulk_user_operation_password_reset(self, test_db: Session, test_user: User, test_hr_user: User):
        """Test bulk password reset operation."""
        service = UserService(test_db)

        result = service.bulk_user_operation(
            user_ids=[test_user.id],
            operation="reset_password",
            performed_by=test_hr_user.id,
        )

        assert result["success_count"] == 1
        assert result["failure_count"] == 0
        assert "New password:" in result["results"][0]["message"]

        # Verify audit history was created
        history = test_db.query(UserHistory).filter(
            UserHistory.user_id == test_user.id,
            UserHistory.action == "password_reset"
        ).first()
        assert history is not None