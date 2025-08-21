"""
Security utilities for password hashing and session management.

This module provides functions for secure password hashing using bcrypt,
session ID generation, and other security-related operations.
"""

import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from passlib.context import CryptContext

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Session configuration
SESSION_ID_LENGTH = 64
SESSION_EXPIRE_HOURS = 24


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password to hash

    Returns:
        str: Hashed password

    Example:
        >>> hashed = hash_password("mypassword")
        >>> verify_password("mypassword", hashed)
        True
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to verify against

    Returns:
        bool: True if password is correct, False otherwise

    Example:
        >>> hashed = hash_password("mypassword")
        >>> verify_password("mypassword", hashed)
        True
        >>> verify_password("wrongpassword", hashed)
        False
    """
    return pwd_context.verify(plain_password, hashed_password)


def generate_session_id() -> str:
    """
    Generate a secure random session ID.

    Returns:
        str: Random session ID suitable for use in cookies

    Example:
        >>> session_id = generate_session_id()
        >>> len(session_id)
        64
    """
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(SESSION_ID_LENGTH))


def calculate_session_expiry(hours: int = SESSION_EXPIRE_HOURS) -> datetime:
    """
    Calculate session expiry datetime.

    Args:
        hours: Number of hours from now for expiry (default: 24)

    Returns:
        datetime: UTC timezone-aware expiry datetime

    Example:
        >>> expiry = calculate_session_expiry(1)
        >>> expiry > datetime.now(timezone.utc)
        True
    """
    return datetime.now(timezone.utc) + timedelta(hours=hours)


def generate_secure_password(length: int = 12) -> str:
    """
    Generate a secure random password.

    Args:
        length: Length of password to generate (default: 12)

    Returns:
        str: Secure random password meeting strength requirements

    Example:
        >>> password = generate_secure_password()
        >>> is_strong, issues = is_password_strong(password)
        >>> is_strong
        True
    """
    # Ensure we have at least one of each required character type
    if length < 8:
        length = 8
    
    # Character sets
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = "!@#$%^&*"
    
    # Guarantee at least one of each type
    password_chars = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    
    # Fill the rest with random characters from all sets
    all_chars = uppercase + lowercase + digits + special
    for _ in range(length - 4):
        password_chars.append(secrets.choice(all_chars))
    
    # Shuffle the password to avoid predictable patterns
    secrets.SystemRandom().shuffle(password_chars)
    
    return "".join(password_chars)


def is_password_strong(password: str) -> tuple[bool, list[str]]:
    """
    Check if password meets strength requirements.

    Requirements:
    - At least 8 characters long
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one digit

    Args:
        password: Password to check

    Returns:
        tuple: (is_strong: bool, issues: list[str])

    Example:
        >>> is_password_strong("TempPass123!")
        (True, [])
        >>> is_password_strong("weak")
        (False, ['Password must be at least 8 characters long', ...])
    """
    issues = []

    if len(password) < 8:
        issues.append("Password must be at least 8 characters long")

    if not any(c.isupper() for c in password):
        issues.append("Password must contain at least one uppercase letter")

    if not any(c.islower() for c in password):
        issues.append("Password must contain at least one lowercase letter")

    if not any(c.isdigit() for c in password):
        issues.append("Password must contain at least one digit")

    return len(issues) == 0, issues


def mask_session_id(session_id: str) -> str:
    """
    Mask session ID for logging purposes.

    Args:
        session_id: Session ID to mask

    Returns:
        str: Masked session ID showing only first and last 4 characters

    Example:
        >>> mask_session_id("abcdefghijklmnopqrstuvwxyz1234567890")
        "abcd****7890"
    """
    if len(session_id) <= 8:
        return "****"
    return f"{session_id[:4]}****{session_id[-4:]}"


def sanitize_ip_address(ip_address: Optional[str]) -> Optional[str]:
    """
    Sanitize IP address for database storage.

    Args:
        ip_address: Raw IP address from request

    Returns:
        Optional[str]: Sanitized IP address or None if invalid

    Example:
        >>> sanitize_ip_address("192.168.1.1")
        "192.168.1.1"
        >>> sanitize_ip_address("invalid")
        None
    """
    if not ip_address:
        return None

    # Basic validation - just check length and character set
    if len(ip_address) > 45:  # IPv6 max length
        return None

    # Allow IPv4 and IPv6 characters
    allowed_chars = set(string.digits + ".:abcdefABCDEF")
    if not all(c in allowed_chars for c in ip_address):
        return None

    return ip_address


def sanitize_user_agent(user_agent: Optional[str]) -> Optional[str]:
    """
    Sanitize user agent string for database storage.

    Args:
        user_agent: Raw user agent from request

    Returns:
        Optional[str]: Sanitized user agent or None if invalid

    Example:
        >>> sanitize_user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    """
    if not user_agent:
        return None

    # Truncate to maximum database length
    if len(user_agent) > 500:
        user_agent = user_agent[:497] + "..."

    return user_agent