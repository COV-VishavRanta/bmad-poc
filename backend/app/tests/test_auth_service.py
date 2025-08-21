"""
Tests for authentication service.

This module tests the AuthService class including user authentication,
session management, password changes, and role-based access control.
"""

import pytest
from datetime import datetime, timedelta, timezone

from app.services.auth_service import (
    AuthService,
    InvalidCredentialsError,
    AccountInactiveError,
    SessionExpiredError,
    RateLimitExceededError,
)
from app.models.user import UserRole, UserStatus
from app.utils.security import hash_password


class TestAuthService:
    """Test authentication service functionality."""

    @pytest.fixture
    def auth_service(self, db_session):
        """Create auth service instance."""
        return AuthService(db_session)

    def test_authenticate_user_success(self, auth_service, test_user):
        """Test successful user authentication."""
        user, session = auth_service.authenticate_user(
            email="test@example.com",
            password="TestPass123!",
            ip_address="127.0.0.1",
            user_agent="Test Agent",
        )

        assert user.id == test_user.id
        assert user.email == test_user.email
        assert session.user_id == test_user.id
        assert session.ip_address == "127.0.0.1"
        assert session.user_agent == "Test Agent"
        assert len(session.session_id) == 64

    def test_authenticate_user_invalid_email(self, auth_service):
        """Test authentication with invalid email."""
        with pytest.raises(InvalidCredentialsError):
            auth_service.authenticate_user(
                email="nonexistent@example.com",
                password="TestPass123!",
            )

    def test_authenticate_user_invalid_password(self, auth_service, test_user):
        """Test authentication with invalid password."""
        with pytest.raises(InvalidCredentialsError):
            auth_service.authenticate_user(
                email="test@example.com",
                password="WrongPassword",
            )

    def test_authenticate_user_inactive_account(self, auth_service, inactive_user):
        """Test authentication with inactive account."""
        with pytest.raises(AccountInactiveError):
            auth_service.authenticate_user(
                email="inactive@example.com",
                password="TestPass123!",
            )

    def test_create_session(self, auth_service, test_user):
        """Test session creation."""
        session = auth_service.create_session(
            user=test_user,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            hours=12,
        )

        assert session.user_id == test_user.id
        assert session.ip_address == "192.168.1.1"
        assert session.user_agent == "Mozilla/5.0"
        assert len(session.session_id) == 64
        
        # Check expiry is approximately 12 hours from now
        expected_expiry = datetime.now(timezone.utc) + timedelta(hours=12)
        time_diff = abs((session.expires_at.replace(tzinfo=timezone.utc) - expected_expiry).total_seconds())
        assert time_diff < 60

    def test_validate_session_valid(self, auth_service, test_session):
        """Test validating a valid session."""
        session = auth_service.validate_session(test_session.session_id)

        assert session is not None
        assert session.session_id == test_session.session_id

    def test_validate_session_expired(self, auth_service, expired_session):
        """Test validating an expired session."""
        session = auth_service.validate_session(expired_session.session_id)

        assert session is None

    def test_validate_session_nonexistent(self, auth_service):
        """Test validating a nonexistent session."""
        session = auth_service.validate_session("nonexistent_session_id")

        assert session is None

    def test_get_user_by_session_valid(self, auth_service, test_user, test_session):
        """Test getting user by valid session."""
        user = auth_service.get_user_by_session(test_session.session_id)

        assert user is not None
        assert user.id == test_user.id

    def test_get_user_by_session_expired(self, auth_service, expired_session):
        """Test getting user by expired session."""
        user = auth_service.get_user_by_session(expired_session.session_id)

        assert user is None

    def test_logout_user_success(self, auth_service, test_session):
        """Test successful user logout."""
        result = auth_service.logout_user(test_session.session_id)

        assert result is True
        
        # Session should no longer exist
        session = auth_service.validate_session(test_session.session_id)
        assert session is None

    def test_logout_user_nonexistent(self, auth_service):
        """Test logout with nonexistent session."""
        result = auth_service.logout_user("nonexistent_session_id")

        assert result is False

    def test_logout_all_user_sessions(self, auth_service, test_user, db_session):
        """Test logging out all user sessions."""
        # Create multiple sessions
        session_ids = []
        for i in range(3):
            session = auth_service.create_session(
                user=test_user,
                ip_address=f"192.168.1.{i+1}",
            )
            session_ids.append(session.session_id)
        db_session.commit()

        # Logout all sessions
        count = auth_service.logout_all_user_sessions(test_user.id)

        assert count == 3

        # All sessions should be gone
        for session_id in session_ids:
            result = auth_service.validate_session(session_id)
            assert result is None

    def test_refresh_session_valid(self, auth_service, test_session):
        """Test refreshing a valid session."""
        old_expiry = test_session.expires_at
        result = auth_service.refresh_session(test_session.session_id, hours=48)

        assert result is True
        
        # Refresh the session from DB
        updated_session = auth_service.validate_session(test_session.session_id)
        assert updated_session.expires_at > old_expiry

    def test_refresh_session_expired(self, auth_service, expired_session):
        """Test refreshing an expired session."""
        result = auth_service.refresh_session(expired_session.session_id)

        assert result is False

    def test_change_password_success(self, auth_service, test_user):
        """Test successful password change."""
        result = auth_service.change_password(
            user_id=test_user.id,
            current_password="TestPass123!",
            new_password="NewPass456!",
        )

        assert result is True
        
        # Should be able to authenticate with new password
        user, session = auth_service.authenticate_user(
            email=test_user.email,
            password="NewPass456!",
        )
        assert user.id == test_user.id

    def test_change_password_wrong_current(self, auth_service, test_user):
        """Test password change with wrong current password."""
        with pytest.raises(InvalidCredentialsError):
            auth_service.change_password(
                user_id=test_user.id,
                current_password="WrongPassword",
                new_password="NewPass456!",
            )

    def test_change_password_weak_new(self, auth_service, test_user):
        """Test password change with weak new password."""
        with pytest.raises(ValueError):
            auth_service.change_password(
                user_id=test_user.id,
                current_password="TestPass123!",
                new_password="weak",
            )

    def test_cleanup_expired_sessions(self, auth_service, test_user, db_session):
        """Test cleaning up expired sessions."""
        # Create mix of valid and expired sessions
        valid_session = auth_service.create_session(user=test_user)
        valid_session_id = valid_session.session_id
        
        # Create expired session manually
        from app.models.user import UserSession
        from app.utils.security import generate_session_id
        
        expired_session_id = generate_session_id()
        expired_session = UserSession(
            session_id=expired_session_id,
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        db_session.add(expired_session)
        db_session.commit()

        # Cleanup expired sessions
        count = auth_service.cleanup_expired_sessions()

        assert count == 1
        
        # Valid session should still exist
        assert auth_service.validate_session(valid_session_id) is not None
        # Expired session should be gone
        assert auth_service.validate_session(expired_session_id) is None

    def test_get_user_active_sessions(self, auth_service, test_user, db_session):
        """Test getting user's active sessions."""
        # Create multiple sessions
        sessions = []
        for i in range(2):
            session = auth_service.create_session(user=test_user)
            sessions.append(session)
        
        # Create expired session
        from app.models.user import UserSession
        from app.utils.security import generate_session_id
        
        expired_session = UserSession(
            session_id=generate_session_id(),
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        db_session.add(expired_session)
        db_session.commit()

        # Get active sessions
        active_sessions = auth_service.get_user_active_sessions(test_user.id)

        assert len(active_sessions) == 2
        session_ids = [s.session_id for s in active_sessions]
        assert sessions[0].session_id in session_ids
        assert sessions[1].session_id in session_ids
        assert expired_session.session_id not in session_ids

    def test_has_permission_hr_access_all(self, auth_service, test_user):
        """Test that HR users have access to all roles."""
        # test_user is HR by default
        assert auth_service.has_permission(test_user, UserRole.HR) is True
        assert auth_service.has_permission(test_user, UserRole.PC) is True
        assert auth_service.has_permission(test_user, UserRole.RM) is True

    def test_has_permission_specific_role(self, auth_service, test_pc_user):
        """Test specific role permissions."""
        assert auth_service.has_permission(test_pc_user, UserRole.PC) is True
        assert auth_service.has_permission(test_pc_user, UserRole.HR) is False
        assert auth_service.has_permission(test_pc_user, UserRole.RM) is False

    def test_has_permission_inactive_user(self, auth_service, inactive_user):
        """Test that inactive users have no permissions."""
        assert auth_service.has_permission(inactive_user, UserRole.HR) is False

    def test_has_any_role_hr_access(self, auth_service, test_user):
        """Test that HR users can access any role combination."""
        allowed_roles = [UserRole.PC, UserRole.RM]
        assert auth_service.has_any_role(test_user, allowed_roles) is True

    def test_has_any_role_matching(self, auth_service, test_pc_user):
        """Test matching role in allowed list."""
        allowed_roles = [UserRole.PC, UserRole.RM]
        assert auth_service.has_any_role(test_pc_user, allowed_roles) is True

    def test_has_any_role_not_matching(self, auth_service, test_pc_user):
        """Test non-matching role in allowed list."""
        allowed_roles = [UserRole.RM]
        assert auth_service.has_any_role(test_pc_user, allowed_roles) is False