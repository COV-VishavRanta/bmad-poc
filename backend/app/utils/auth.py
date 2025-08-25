"""
Authentication utilities for password hashing and session management.

This module provides secure password hashing using bcrypt and
session token generation for user authentication.
"""

import secrets
from datetime import datetime, timedelta
from typing import Optional

import bcrypt


class PasswordHash:
    """Utility class for password hashing and verification."""

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using bcrypt.
        
        Args:
            password: Plain text password to hash
            
        Returns:
            Hashed password as string
        """
        # Generate salt and hash password
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.
        
        Args:
            password: Plain text password to verify
            hashed_password: Hashed password to compare against
            
        Returns:
            True if password matches, False otherwise
        """
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )


class SessionManager:
    """Utility class for session token management."""

    @staticmethod
    def generate_session_token() -> str:
        """
        Generate a secure random session token.
        
        Returns:
            Secure random token string
        """
        return secrets.token_urlsafe(32)

    @staticmethod
    def create_session_expiry(hours: int = 24) -> datetime:
        """
        Create a session expiry datetime.
        
        Args:
            hours: Number of hours from now for expiry (default: 24)
            
        Returns:
            DateTime object for session expiry
        """
        return datetime.utcnow() + timedelta(hours=hours)

    @staticmethod
    def is_session_expired(expires_at: datetime) -> bool:
        """
        Check if a session is expired.
        
        Args:
            expires_at: Session expiry datetime
            
        Returns:
            True if session is expired, False otherwise
        """
        return datetime.utcnow() > expires_at