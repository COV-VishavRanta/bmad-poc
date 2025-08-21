"""
Core module for ClientOps application.

Contains shared utilities, configurations, and base classes.
"""

from app.core.exceptions import *
from app.core.logging_config import get_logger, setup_logging
from app.core.exception_handlers import register_exception_handlers
from app.core.middleware import LoggingMiddleware, SecurityHeadersMiddleware, CORSLoggingMiddleware

__all__ = [
    # Exceptions
    "ClientOpsException",
    "ValidationError", 
    "NotFoundError",
    "AuthenticationError",
    "AuthorizationError",
    "ConflictError",
    "DatabaseError",
    "ExternalServiceError",
    "BusinessLogicError",
    "RateLimitError",
    "ConfigurationError",
    
    # Logging
    "get_logger",
    "setup_logging",
    
    # Exception handlers
    "register_exception_handlers",
    
    # Middleware
    "LoggingMiddleware",
    "SecurityHeadersMiddleware", 
    "CORSLoggingMiddleware",
]