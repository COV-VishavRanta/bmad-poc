"""
Custom exception classes for ClientOps application.

Provides structured exception handling with proper HTTP status codes
and error messages for different business logic scenarios.
"""

from typing import Any, Dict, Optional


class ClientOpsException(Exception):
    """Base exception class for ClientOps application."""

    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "error": self.error_code,
            "message": self.message,
            "details": self.details,
        }


class ValidationError(ClientOpsException):
    """Raised when data validation fails."""

    def __init__(
        self,
        message: str = "Validation failed",
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.field = field
        super().__init__(message, "VALIDATION_ERROR", details)


class NotFoundError(ClientOpsException):
    """Raised when a requested resource is not found."""

    def __init__(
        self,
        resource: str = "Resource",
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        message = f"{resource} not found"
        if resource_id:
            message += f" with ID: {resource_id}"
        super().__init__(message, "NOT_FOUND", details)


class AuthenticationError(ClientOpsException):
    """Raised when authentication fails."""

    def __init__(
        self,
        message: str = "Authentication failed",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message, "AUTHENTICATION_ERROR", details)


class AuthorizationError(ClientOpsException):
    """Raised when user lacks permission for an action."""

    def __init__(
        self,
        message: str = "Insufficient permissions",
        required_permission: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if required_permission:
            message += f" (required: {required_permission})"
        super().__init__(message, "AUTHORIZATION_ERROR", details)


class ConflictError(ClientOpsException):
    """Raised when there's a conflict with the current state."""

    def __init__(
        self,
        message: str = "Conflict detected",
        conflicting_resource: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if conflicting_resource:
            message += f" with {conflicting_resource}"
        super().__init__(message, "CONFLICT_ERROR", details)


class DatabaseError(ClientOpsException):
    """Raised when database operations fail."""

    def __init__(
        self,
        message: str = "Database operation failed",
        operation: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if operation:
            message += f" during {operation}"
        super().__init__(message, "DATABASE_ERROR", details)


class ExternalServiceError(ClientOpsException):
    """Raised when external service calls fail."""

    def __init__(
        self,
        message: str = "External service error",
        service: Optional[str] = None,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if service:
            message = f"{service}: {message}"
        if status_code:
            message += f" (HTTP {status_code})"
        super().__init__(message, "EXTERNAL_SERVICE_ERROR", details)


class BusinessLogicError(ClientOpsException):
    """Raised when business logic rules are violated."""

    def __init__(
        self,
        message: str = "Business logic violation",
        rule: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if rule:
            message += f" (rule: {rule})"
        super().__init__(message, "BUSINESS_LOGIC_ERROR", details)


class RateLimitError(ClientOpsException):
    """Raised when rate limits are exceeded."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if retry_after:
            message += f" (retry after {retry_after} seconds)"
        super().__init__(message, "RATE_LIMIT_ERROR", details)


class ConfigurationError(ClientOpsException):
    """Raised when there are configuration issues."""

    def __init__(
        self,
        message: str = "Configuration error",
        config_key: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if config_key:
            message += f" for {config_key}"
        super().__init__(message, "CONFIGURATION_ERROR", details)