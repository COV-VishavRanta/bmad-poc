"""
Tests for security utilities.

This module tests password hashing, session ID generation,
and other security-related utility functions.
"""

import pytest
from datetime import datetime, timedelta, timezone

from app.utils.security import (
    hash_password,
    verify_password,
    generate_session_id,
    calculate_session_expiry,
    is_password_strong,
    mask_session_id,
    sanitize_ip_address,
    sanitize_user_agent,
)


class TestPasswordHashing:
    """Test password hashing and verification."""

    def test_hash_password(self):
        """Test password hashing."""
        password = "TestPassword123!"
        hashed = hash_password(password)

        assert hashed != password
        assert len(hashed) > 50  # bcrypt hashes are long
        assert hashed.startswith("$2b$")

    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = "TestPassword123!"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        password = "TestPassword123!"
        wrong_password = "WrongPassword123!"
        hashed = hash_password(password)

        assert verify_password(wrong_password, hashed) is False

    def test_hash_password_different_each_time(self):
        """Test that hashing the same password produces different hashes."""
        password = "TestPassword123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestSessionGeneration:
    """Test session ID generation and expiry calculation."""

    def test_generate_session_id(self):
        """Test session ID generation."""
        session_id = generate_session_id()

        assert len(session_id) == 64
        assert session_id.isalnum()

    def test_generate_session_id_unique(self):
        """Test that session IDs are unique."""
        session_ids = [generate_session_id() for _ in range(100)]
        assert len(set(session_ids)) == 100

    def test_calculate_session_expiry_default(self):
        """Test default session expiry calculation."""
        before = datetime.now(timezone.utc)
        expiry = calculate_session_expiry()
        after = datetime.now(timezone.utc)

        # Should be 24 hours from now
        expected_min = before + timedelta(hours=24)
        expected_max = after + timedelta(hours=24)

        assert expected_min <= expiry <= expected_max

    def test_calculate_session_expiry_custom(self):
        """Test custom session expiry calculation."""
        before = datetime.now(timezone.utc)
        expiry = calculate_session_expiry(hours=12)
        after = datetime.now(timezone.utc)

        # Should be 12 hours from now
        expected_min = before + timedelta(hours=12)
        expected_max = after + timedelta(hours=12)

        assert expected_min <= expiry <= expected_max


class TestPasswordValidation:
    """Test password strength validation."""

    def test_password_strong_valid(self):
        """Test valid strong password."""
        is_strong, issues = is_password_strong("TestPass123!")

        assert is_strong is True
        assert issues == []

    def test_password_too_short(self):
        """Test password that's too short."""
        is_strong, issues = is_password_strong("Test1!")

        assert is_strong is False
        assert "Password must be at least 8 characters long" in issues

    def test_password_no_uppercase(self):
        """Test password without uppercase letters."""
        is_strong, issues = is_password_strong("testpass123!")

        assert is_strong is False
        assert "Password must contain at least one uppercase letter" in issues

    def test_password_no_lowercase(self):
        """Test password without lowercase letters."""
        is_strong, issues = is_password_strong("TESTPASS123!")

        assert is_strong is False
        assert "Password must contain at least one lowercase letter" in issues

    def test_password_no_digits(self):
        """Test password without digits."""
        is_strong, issues = is_password_strong("TestPassword!")

        assert is_strong is False
        assert "Password must contain at least one digit" in issues

    def test_password_multiple_issues(self):
        """Test password with multiple issues."""
        is_strong, issues = is_password_strong("weak")

        assert is_strong is False
        assert len(issues) == 3  # Missing uppercase, digit, and too short
        assert "Password must be at least 8 characters long" in issues
        assert "Password must contain at least one uppercase letter" in issues
        assert "Password must contain at least one digit" in issues


class TestUtilityFunctions:
    """Test utility functions for security."""

    def test_mask_session_id(self):
        """Test session ID masking."""
        session_id = "abcdefghijklmnopqrstuvwxyz1234567890123456789012345678901234"
        masked = mask_session_id(session_id)

        assert masked == "abcd****1234"

    def test_mask_session_id_short(self):
        """Test masking short session ID."""
        session_id = "short"
        masked = mask_session_id(session_id)

        assert masked == "****"

    def test_sanitize_ip_address_valid_ipv4(self):
        """Test sanitizing valid IPv4 address."""
        ip = "192.168.1.1"
        sanitized = sanitize_ip_address(ip)

        assert sanitized == ip

    def test_sanitize_ip_address_valid_ipv6(self):
        """Test sanitizing valid IPv6 address."""
        ip = "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
        sanitized = sanitize_ip_address(ip)

        assert sanitized == ip

    def test_sanitize_ip_address_invalid(self):
        """Test sanitizing invalid IP address."""
        ip = "invalid_ip_address"
        sanitized = sanitize_ip_address(ip)

        assert sanitized is None

    def test_sanitize_ip_address_too_long(self):
        """Test sanitizing IP address that's too long."""
        ip = "a" * 50  # Too long for any valid IP
        sanitized = sanitize_ip_address(ip)

        assert sanitized is None

    def test_sanitize_ip_address_none(self):
        """Test sanitizing None IP address."""
        sanitized = sanitize_ip_address(None)

        assert sanitized is None

    def test_sanitize_user_agent_valid(self):
        """Test sanitizing valid user agent."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        sanitized = sanitize_user_agent(ua)

        assert sanitized == ua

    def test_sanitize_user_agent_too_long(self):
        """Test sanitizing user agent that's too long."""
        ua = "a" * 600  # Too long
        sanitized = sanitize_user_agent(ua)

        assert len(sanitized) == 500
        assert sanitized.endswith("...")

    def test_sanitize_user_agent_none(self):
        """Test sanitizing None user agent."""
        sanitized = sanitize_user_agent(None)

        assert sanitized is None