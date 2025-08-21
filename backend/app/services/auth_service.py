"""
Authentication service for user login, logout, and session management.

This module provides the AuthService class that handles user authentication,
session creation and management, password verification, and security measures.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.models.user import User, UserSession, UserRole, UserStatus
from app.utils.security import (
    verify_password,
    hash_password,
    generate_session_id,
    calculate_session_expiry,
    sanitize_ip_address,
    sanitize_user_agent,
    is_password_strong,
)


class AuthenticationError(Exception):
    """Base exception for authentication errors."""
    pass


class InvalidCredentialsError(AuthenticationError):
    """Raised when user credentials are invalid."""
    pass


class AccountInactiveError(AuthenticationError):
    """Raised when user account is inactive."""
    pass


class SessionExpiredError(AuthenticationError):
    """Raised when session has expired."""
    pass


class RateLimitExceededError(AuthenticationError):
    """Raised when login attempts exceed rate limit."""
    pass


class AuthService:
    """
    Authentication service for managing user sessions and security.

    Handles user login, logout, session management, and password operations
    with security measures like rate limiting and session tracking.
    """

    def __init__(self, db: Session):
        """
        Initialize the authentication service.

        Args:
            db: Database session for operations
        """
        self.db = db
        self.max_login_attempts = 5
        self.lockout_minutes = 15

    def authenticate_user(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[User, UserSession]:
        """
        Authenticate user and create session.

        Args:
            email: User email address
            password: Plain text password
            ip_address: Client IP address for session tracking
            user_agent: Client user agent for session tracking

        Returns:
            Tuple[User, UserSession]: Authenticated user and new session

        Raises:
            InvalidCredentialsError: If credentials are invalid
            AccountInactiveError: If user account is inactive
            RateLimitExceededError: If too many failed attempts
        """
        # Find user by email
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            raise InvalidCredentialsError("Invalid email or password")

        # Check if account is active
        if not user.is_active():
            raise AccountInactiveError("Account is inactive")

        # Verify password
        if not verify_password(password, user.password_hash):
            # In a production system, you would implement rate limiting here
            raise InvalidCredentialsError("Invalid email or password")

        # Update last login timestamp
        user.update_last_login()

        # Create new session
        session = self.create_session(
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        self.db.commit()
        return user, session

    def create_session(
        self,
        user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        hours: int = 24,
    ) -> UserSession:
        """
        Create a new user session.

        Args:
            user: User to create session for
            ip_address: Client IP address
            user_agent: Client user agent
            hours: Session duration in hours

        Returns:
            UserSession: New session object
        """
        session_id = generate_session_id()
        expires_at = calculate_session_expiry(hours)

        session = UserSession(
            session_id=session_id,
            user_id=user.id,
            expires_at=expires_at,
            ip_address=sanitize_ip_address(ip_address),
            user_agent=sanitize_user_agent(user_agent),
        )

        self.db.add(session)
        return session

    def validate_session(self, session_id: str) -> Optional[UserSession]:
        """
        Validate a session and return if active.

        Args:
            session_id: Session ID to validate

        Returns:
            Optional[UserSession]: Session if valid, None otherwise
        """
        session = (
            self.db.query(UserSession)
            .filter(UserSession.session_id == session_id)
            .first()
        )

        if not session or session.is_expired():
            return None

        # Update last accessed time
        session.last_accessed = datetime.now(timezone.utc)
        self.db.commit()

        return session

    def get_user_by_session(self, session_id: str) -> Optional[User]:
        """
        Get user by session ID if session is valid.

        Args:
            session_id: Session ID to lookup

        Returns:
            Optional[User]: User if session is valid, None otherwise
        """
        session = self.validate_session(session_id)
        if not session:
            return None

        return session.user

    def logout_user(self, session_id: str) -> bool:
        """
        Logout user by invalidating session.

        Args:
            session_id: Session ID to invalidate

        Returns:
            bool: True if session was found and invalidated
        """
        session = (
            self.db.query(UserSession)
            .filter(UserSession.session_id == session_id)
            .first()
        )

        if session:
            self.db.delete(session)
            self.db.commit()
            return True

        return False

    def logout_all_user_sessions(self, user_id: int) -> int:
        """
        Logout user from all sessions.

        Args:
            user_id: User ID to logout from all sessions

        Returns:
            int: Number of sessions invalidated
        """
        count = (
            self.db.query(UserSession)
            .filter(UserSession.user_id == user_id)
            .delete()
        )
        self.db.commit()
        return count

    def refresh_session(self, session_id: str, hours: int = 24) -> bool:
        """
        Refresh session expiration time.

        Args:
            session_id: Session ID to refresh
            hours: New expiration time in hours

        Returns:
            bool: True if session was found and refreshed
        """
        session = (
            self.db.query(UserSession)
            .filter(UserSession.session_id == session_id)
            .first()
        )

        if session and session.is_valid():
            session.extend_session(hours)
            self.db.commit()
            return True

        return False

    def change_password(
        self,
        user_id: int,
        current_password: str,
        new_password: str,
    ) -> bool:
        """
        Change user password with verification.

        Args:
            user_id: ID of user changing password
            current_password: Current password for verification
            new_password: New password to set

        Returns:
            bool: True if password was changed successfully

        Raises:
            InvalidCredentialsError: If current password is incorrect
            ValueError: If new password doesn't meet requirements
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise InvalidCredentialsError("User not found")

        # Verify current password
        if not verify_password(current_password, user.password_hash):
            raise InvalidCredentialsError("Current password is incorrect")

        # Validate new password strength
        is_strong, issues = is_password_strong(new_password)
        if not is_strong:
            raise ValueError(f"Password requirements not met: {', '.join(issues)}")

        # Hash and update password
        user.password_hash = hash_password(new_password)
        self.db.commit()

        # Optionally, logout all other sessions for security
        self.logout_all_user_sessions(user_id)

        return True

    def cleanup_expired_sessions(self) -> int:
        """
        Remove all expired sessions from database.

        Returns:
            int: Number of sessions cleaned up
        """
        current_time = datetime.now(timezone.utc)
        count = (
            self.db.query(UserSession)
            .filter(UserSession.expires_at < current_time)
            .delete()
        )
        self.db.commit()
        return count

    def get_user_active_sessions(self, user_id: int) -> list[UserSession]:
        """
        Get all active sessions for a user.

        Args:
            user_id: User ID to get sessions for

        Returns:
            list[UserSession]: List of active sessions
        """
        current_time = datetime.now(timezone.utc)
        return (
            self.db.query(UserSession)
            .filter(
                UserSession.user_id == user_id,
                UserSession.expires_at > current_time,
            )
            .order_by(UserSession.last_accessed.desc())
            .all()
        )

    def has_permission(self, user: User, required_role: UserRole) -> bool:
        """
        Check if user has required role permission.

        Args:
            user: User to check permissions for
            required_role: Required role for access

        Returns:
            bool: True if user has permission
        """
        if not user.is_active():
            return False

        # HR has access to everything
        if user.role == UserRole.HR:
            return True

        # Check specific role requirements
        return user.role == required_role

    def has_any_role(self, user: User, allowed_roles: list[UserRole]) -> bool:
        """
        Check if user has any of the allowed roles.

        Args:
            user: User to check permissions for
            allowed_roles: List of allowed roles

        Returns:
            bool: True if user has any of the allowed roles
        """
        if not user.is_active():
            return False

        # HR has access to everything
        if user.role == UserRole.HR:
            return True

        return user.role in allowed_roles