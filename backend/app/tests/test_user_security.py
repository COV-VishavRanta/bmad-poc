"""
Tests for user management security features.

This module contains tests for security enhancements including privilege escalation
prevention, rate limiting, audit logging, and access control.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User, UserRole, UserStatus
from app.utils.user_security import (
    prevent_privilege_escalation,
    validate_password_complexity,
    generate_secure_password,
    check_rate_limit,
    SecurityViolationError,
    RateLimitExceededError,
    SecurityLogger,
)


class TestPrivilegeEscalationPrevention:
    """Tests for privilege escalation prevention."""

    def test_prevent_self_role_modification(self, sample_user):
        """Test that users cannot modify their own role."""
        with pytest.raises(SecurityViolationError) as exc_info:
            prevent_privilege_escalation(
                current_user=sample_user,
                target_user_id=sample_user.id,
                new_role=UserRole.HR
            )
        assert "modify their own role" in str(exc_info.value)

    def test_prevent_self_deactivation(self, sample_user):
        """Test that users cannot deactivate themselves."""
        with pytest.raises(SecurityViolationError) as exc_info:
            prevent_privilege_escalation(
                current_user=sample_user,
                target_user_id=sample_user.id
            )
        assert "deactivate their own account" in str(exc_info.value)

    def test_allow_modification_of_other_users(self, sample_user, sample_hr_user):
        """Test that users can modify other users."""
        # Should not raise an exception
        prevent_privilege_escalation(
            current_user=sample_hr_user,
            target_user_id=sample_user.id,
            new_role=UserRole.PC
        )


class TestPasswordSecurity:
    """Tests for password security features."""

    def test_password_complexity_validation_too_short(self):
        """Test password complexity validation for short passwords."""
        assert not validate_password_complexity("short")

    def test_password_complexity_validation_no_uppercase(self):
        """Test password complexity validation for missing uppercase."""
        assert not validate_password_complexity("lowercase123!")

    def test_password_complexity_validation_no_lowercase(self):
        """Test password complexity validation for missing lowercase."""
        assert not validate_password_complexity("UPPERCASE123!")

    def test_password_complexity_validation_no_digit(self):
        """Test password complexity validation for missing digit."""
        assert not validate_password_complexity("NoDigitsHere!")

    def test_password_complexity_validation_no_special(self):
        """Test password complexity validation for missing special character."""
        assert not validate_password_complexity("NoSpecial123")

    def test_password_complexity_validation_valid(self):
        """Test password complexity validation for valid password."""
        assert validate_password_complexity("ValidPass123!")

    def test_generate_secure_password_length(self):
        """Test secure password generation length."""
        password = generate_secure_password(16)
        assert len(password) == 16

    def test_generate_secure_password_minimum_length(self):
        """Test secure password generation enforces minimum length."""
        password = generate_secure_password(8)  # Less than minimum
        assert len(password) == 12  # Should be increased to minimum

    def test_generate_secure_password_complexity(self):
        """Test generated password meets complexity requirements."""
        password = generate_secure_password()
        assert validate_password_complexity(password)

    def test_generate_secure_password_uniqueness(self):
        """Test that generated passwords are unique."""
        password1 = generate_secure_password()
        password2 = generate_secure_password()
        assert password1 != password2


class TestRateLimiting:
    """Tests for rate limiting functionality."""

    def test_rate_limit_allows_within_limit(self):
        """Test that rate limiting allows operations within limit."""
        key = "test_user_1"
        # Should not raise exception for first few attempts
        for i in range(3):
            check_rate_limit(key, limit=5, window_minutes=60)

    def test_rate_limit_blocks_over_limit(self):
        """Test that rate limiting blocks operations over limit."""
        key = "test_user_2"
        
        # Fill up the rate limit
        for i in range(5):
            check_rate_limit(key, limit=5, window_minutes=60)
        
        # Next attempt should be blocked
        with pytest.raises(RateLimitExceededError) as exc_info:
            check_rate_limit(key, limit=5, window_minutes=60)
        assert "Rate limit exceeded" in str(exc_info.value)

    def test_rate_limit_resets_after_window(self):
        """Test that rate limit resets after time window."""
        key = "test_user_3"
        
        # Fill up the rate limit
        for i in range(3):
            check_rate_limit(key, limit=3, window_minutes=1)
        
        # Mock time passage
        with patch('app.utils.user_security.datetime') as mock_datetime:
            from datetime import datetime, timedelta
            # Simulate time passing beyond window
            mock_datetime.utcnow.return_value = datetime.utcnow() + timedelta(minutes=2)
            
            # Should allow new attempts after window passes
            check_rate_limit(key, limit=3, window_minutes=1)


class TestSecurityLogging:
    """Tests for security logging functionality."""

    @patch('app.utils.user_security.print')
    def test_security_event_logging(self, mock_print):
        """Test security event logging."""
        SecurityLogger.log_security_event(
            event_type="TEST_EVENT",
            user_id=1,
            details={"action": "test"},
            client_info={"ip_address": "127.0.0.1", "user_agent": "test"},
            severity="INFO"
        )
        
        # Verify logging was called
        mock_print.assert_called_once()
        call_args = mock_print.call_args[0][0]
        assert "[SECURITY]" in call_args
        assert "TEST_EVENT" in call_args

    @patch('app.utils.user_security.print')
    def test_failed_access_attempt_logging(self, mock_print):
        """Test failed access attempt logging."""
        SecurityLogger.log_failed_access_attempt(
            user_id=1,
            attempted_resource="/api/users",
            client_info={"ip_address": "127.0.0.1", "user_agent": "test"}
        )
        
        mock_print.assert_called_once()
        call_args = mock_print.call_args[0][0]
        assert "FAILED_ACCESS_ATTEMPT" in call_args

    @patch('app.utils.user_security.print')
    def test_privilege_escalation_attempt_logging(self, mock_print):
        """Test privilege escalation attempt logging."""
        SecurityLogger.log_privilege_escalation_attempt(
            user_id=1,
            target_user_id=2,
            attempted_action="role_change",
            client_info={"ip_address": "127.0.0.1", "user_agent": "test"}
        )
        
        mock_print.assert_called_once()
        call_args = mock_print.call_args[0][0]
        assert "PRIVILEGE_ESCALATION_ATTEMPT" in call_args


class TestAPISecurityIntegration:
    """Integration tests for API security features."""

    def test_role_change_rate_limiting(self, client: TestClient, auth_headers):
        """Test rate limiting on role change endpoint."""
        user_id = 2
        
        # Make multiple requests to trigger rate limit
        for i in range(11):  # Over the limit of 10
            response = client.put(
                f"/api/users/{user_id}/role",
                json={"role": "PC"},
                headers=auth_headers
            )
            
            if i < 10:
                # First 10 should succeed or fail for other reasons
                assert response.status_code in [200, 404, 403]
            else:
                # 11th should be rate limited
                assert response.status_code == 429
                assert "Rate limit exceeded" in response.json()["detail"]["message"]

    def test_status_change_rate_limiting(self, client: TestClient, auth_headers):
        """Test rate limiting on status change endpoint."""
        user_id = 2
        
        # Make multiple requests to trigger rate limit
        for i in range(21):  # Over the limit of 20
            response = client.put(
                f"/api/users/{user_id}/status",
                json={"status": "active"},
                headers=auth_headers
            )
            
            if i < 20:
                # First 20 should succeed or fail for other reasons
                assert response.status_code in [200, 404, 403]
            else:
                # 21st should be rate limited
                assert response.status_code == 429

    def test_self_role_modification_blocked(self, client: TestClient, auth_headers):
        """Test that self role modification is blocked."""
        # Assuming auth_headers are for user with ID 1
        response = client.put(
            "/api/users/1/role",
            json={"role": "PC"},
            headers=auth_headers
        )
        
        assert response.status_code == 403
        assert "cannot change their own role" in response.json()["detail"]["message"]

    def test_self_deactivation_blocked(self, client: TestClient, auth_headers):
        """Test that self deactivation is blocked."""
        # Assuming auth_headers are for user with ID 1
        response = client.put(
            "/api/users/1/status",
            json={"status": "inactive"},
            headers=auth_headers
        )
        
        assert response.status_code == 403
        assert "cannot deactivate their own account" in response.json()["detail"]["message"]

    def test_non_hr_access_blocked(self, client: TestClient):
        """Test that non-HR users cannot access user management."""
        # Create non-HR user token
        non_hr_headers = {"Authorization": "Bearer non_hr_token"}
        
        response = client.get("/api/users", headers=non_hr_headers)
        assert response.status_code == 403
        assert "HR role required" in response.json()["detail"]["message"]


class TestDataSanitization:
    """Tests for sensitive data sanitization."""

    def test_sanitize_audit_data_removes_sensitive_fields(self):
        """Test that sensitive fields are removed from audit data."""
        from app.utils.user_security import sanitize_audit_data
        
        data = {
            "email": "user@example.com",
            "password": "secret123",
            "role": "HR",
            "token": "sensitive_token"
        }
        
        sanitized = sanitize_audit_data(data)
        
        assert sanitized["email"] == "user@example.com"
        assert sanitized["role"] == "HR"
        assert sanitized["password"] == "[REDACTED]"
        assert sanitized["token"] == "[REDACTED]"

    def test_sanitize_audit_data_handles_nested_objects(self):
        """Test that nested objects are properly sanitized."""
        from app.utils.user_security import sanitize_audit_data
        
        data = {
            "user": {
                "email": "user@example.com",
                "password_hash": "hashed_password"
            },
            "metadata": {
                "secret": "sensitive_data"
            }
        }
        
        sanitized = sanitize_audit_data(data)
        
        assert sanitized["user"]["email"] == "user@example.com"
        assert sanitized["user"]["password_hash"] == "[REDACTED]"
        assert sanitized["metadata"]["secret"] == "[REDACTED]"