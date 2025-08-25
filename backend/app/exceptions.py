"""
Custom exception classes for the B-MAD Client Ops API.

This module defines custom exception classes and error handling
following coding standards for consistent error responses.
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class BMadAPIException(HTTPException):
    """Base exception class for B-MAD API errors."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class DatabaseConnectionError(BMadAPIException):
    """Exception raised when database connection fails."""
    
    def __init__(self, detail: str = "Database connection failed"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )


class HealthCheckError(BMadAPIException):
    """Exception raised when health check fails."""
    
    def __init__(self, detail: str = "Health check failed"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )


class UserAlreadyExistsError(BMadAPIException):
    """Exception raised when trying to create a user that already exists."""
    
    def __init__(self, detail: str = "User already exists"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail
        )


class UserNotFoundError(BMadAPIException):
    """Exception raised when user is not found."""
    
    def __init__(self, detail: str = "User not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )


class InvalidCredentialsError(BMadAPIException):
    """Exception raised when authentication credentials are invalid."""
    
    def __init__(self, detail: str = "Invalid credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )


class AuthenticationRequiredError(BMadAPIException):
    """Exception raised when authentication is required but not provided."""
    
    def __init__(self, detail: str = "Authentication required"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )


class InsufficientPermissionsError(BMadAPIException):
    """Exception raised when user doesn't have required permissions."""
    
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )