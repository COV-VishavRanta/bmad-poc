"""
Custom middleware for authentication and role-based access control.

This module provides FastAPI middleware for session validation,
user authentication, and role-based endpoint protection.
"""

from typing import Callable, Optional

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.services.auth_service import AuthService
from app.schemas.auth import ErrorResponse


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Middleware for handling user authentication via session cookies.

    This middleware validates session cookies and sets the current user
    in the request state for downstream use in route handlers.
    """

    def __init__(self, app):
        """Initialize the authentication middleware."""
        super().__init__(app)
        self.session_cookie_name = "clientops_session"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request through authentication middleware.

        Args:
            request: Incoming HTTP request
            call_next: Next middleware or route handler

        Returns:
            Response: HTTP response
        """
        # Initialize request state
        request.state.user = None
        request.state.session_id = None

        # Skip authentication for certain paths
        if self._should_skip_auth(request.url.path):
            return await call_next(request)

        # Extract session from cookie
        session_id = request.cookies.get(self.session_cookie_name)
        if session_id:
            # Validate session and get user
            db = SessionLocal()
            try:
                auth_service = AuthService(db)
                user = auth_service.get_user_by_session(session_id)
                if user:
                    request.state.user = user
                    request.state.session_id = session_id
            finally:
                db.close()

        return await call_next(request)

    def _should_skip_auth(self, path: str) -> bool:
        """
        Check if authentication should be skipped for this path.

        Args:
            path: Request path

        Returns:
            bool: True if auth should be skipped
        """
        skip_paths = [
            "/api/health",
            "/api/auth/login",
            "/docs",
            "/openapi.json",
            "/redoc",
        ]

        return any(path.startswith(skip_path) for skip_path in skip_paths)


def require_auth(request: Request) -> User:
    """
    Dependency to require authentication for a route.

    Args:
        request: FastAPI request object

    Returns:
        User: Authenticated user

    Raises:
        HTTPException: If user is not authenticated
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status": "error",
                "message": "Authentication required",
                "code": "AUTH_001",
            },
        )
    return user


def require_role(required_role: UserRole):
    """
    Dependency factory to require a specific role for a route.

    Args:
        required_role: Required user role

    Returns:
        Callable: Dependency function
    """

    def role_dependency(user: User = require_auth) -> User:
        """
        Check if user has required role.

        Args:
            user: Authenticated user from require_auth dependency

        Returns:
            User: User if they have required role

        Raises:
            HTTPException: If user doesn't have required role
        """
        db = SessionLocal()
        try:
            auth_service = AuthService(db)
            if not auth_service.has_permission(user, required_role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "status": "error",
                        "message": f"Access denied. {required_role.value} role required.",
                        "code": "AUTH_002",
                    },
                )
        finally:
            db.close()

        return user

    return role_dependency


def require_any_role(allowed_roles: list[UserRole]):
    """
    Dependency factory to require any of the specified roles.

    Args:
        allowed_roles: List of allowed user roles

    Returns:
        Callable: Dependency function
    """

    def role_dependency(user: User = require_auth) -> User:
        """
        Check if user has any of the allowed roles.

        Args:
            user: Authenticated user from require_auth dependency

        Returns:
            User: User if they have any allowed role

        Raises:
            HTTPException: If user doesn't have any allowed role
        """
        db = SessionLocal()
        try:
            auth_service = AuthService(db)
            if not auth_service.has_any_role(user, allowed_roles):
                role_names = [role.value for role in allowed_roles]
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "status": "error",
                        "message": f"Access denied. One of these roles required: {', '.join(role_names)}",
                        "code": "AUTH_003",
                    },
                )
        finally:
            db.close()

        return user

    return role_dependency


def get_current_user(request: Request) -> Optional[User]:
    """
    Get current user from request state without requiring authentication.

    Args:
        request: FastAPI request object

    Returns:
        Optional[User]: Current user if authenticated, None otherwise
    """
    return getattr(request.state, "user", None)


def get_session_id(request: Request) -> Optional[str]:
    """
    Get current session ID from request state.

    Args:
        request: FastAPI request object

    Returns:
        Optional[str]: Session ID if authenticated, None otherwise
    """
    return getattr(request.state, "session_id", None)