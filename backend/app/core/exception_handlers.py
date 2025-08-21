"""
Global exception handlers for FastAPI application.

Provides centralized error handling with proper HTTP status codes,
logging, and consistent error response format.
"""

import traceback
from typing import Any, Dict

from fastapi import HTTPException, Request, status
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    BusinessLogicError,
    ClientOpsException,
    ConflictError,
    ConfigurationError,
    DatabaseError,
    ExternalServiceError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)
from app.core.logging_config import get_logger

logger = get_logger(__name__)


def create_error_response(
    status_code: int,
    error_code: str,
    message: str,
    details: Dict[str, Any] = None,
    request_id: str = None,
) -> JSONResponse:
    """Create a standardized error response."""
    content = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "details": details or {},
        },
    }
    
    if request_id:
        content["request_id"] = request_id
    
    return JSONResponse(status_code=status_code, content=content)


async def clientops_exception_handler(
    request: Request, exc: ClientOpsException
) -> JSONResponse:
    """Handle custom ClientOps exceptions."""
    request_id = getattr(request.state, "request_id", None)
    
    # Map exception types to HTTP status codes
    status_code_map = {
        ValidationError: status.HTTP_400_BAD_REQUEST,
        NotFoundError: status.HTTP_404_NOT_FOUND,
        AuthenticationError: status.HTTP_401_UNAUTHORIZED,
        AuthorizationError: status.HTTP_403_FORBIDDEN,
        ConflictError: status.HTTP_409_CONFLICT,
        BusinessLogicError: status.HTTP_422_UNPROCESSABLE_ENTITY,
        RateLimitError: status.HTTP_429_TOO_MANY_REQUESTS,
        ConfigurationError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        DatabaseError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        ExternalServiceError: status.HTTP_502_BAD_GATEWAY,
    }
    
    status_code = status_code_map.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    logger.error(
        f"ClientOps exception: {exc.error_code}",
        extra={
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    return create_error_response(
        status_code=status_code,
        error_code=exc.error_code,
        message=exc.message,
        details=exc.details,
        request_id=request_id,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors."""
    request_id = getattr(request.state, "request_id", None)
    
    logger.warning(
        "Validation error",
        extra={
            "errors": exc.errors(),
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    # Format validation errors
    formatted_errors = []
    for error in exc.errors():
        formatted_errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code="VALIDATION_ERROR",
        message="Request validation failed",
        details={"errors": formatted_errors},
        request_id=request_id,
    )


async def http_exception_handler_custom(
    request: Request, exc: HTTPException
) -> JSONResponse:
    """Handle HTTP exceptions with logging."""
    request_id = getattr(request.state, "request_id", None)
    
    logger.warning(
        f"HTTP exception: {exc.status_code}",
        extra={
            "status_code": exc.status_code,
            "detail": exc.detail,
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    return create_error_response(
        status_code=exc.status_code,
        error_code="HTTP_ERROR",
        message=exc.detail,
        request_id=request_id,
    )


async def sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """Handle SQLAlchemy database errors."""
    request_id = getattr(request.state, "request_id", None)
    
    logger.error(
        "Database error",
        extra={
            "error": str(exc),
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    # Don't expose internal database errors in production
    message = "A database error occurred"
    details = {}
    
    # In development, provide more details
    import os
    if os.getenv("ENVIRONMENT", "development").lower() == "development":
        details["error"] = str(exc)
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="DATABASE_ERROR",
        message=message,
        details=details,
        request_id=request_id,
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all other unhandled exceptions."""
    request_id = getattr(request.state, "request_id", None)
    
    logger.error(
        "Unhandled exception",
        extra={
            "error": str(exc),
            "type": type(exc).__name__,
            "traceback": traceback.format_exc(),
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    # Don't expose internal errors in production
    message = "An internal server error occurred"
    details = {}
    
    # In development, provide more details
    import os
    if os.getenv("ENVIRONMENT", "development").lower() == "development":
        details["error"] = str(exc)
        details["type"] = type(exc).__name__
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="INTERNAL_ERROR",
        message=message,
        details=details,
        request_id=request_id,
    )


def register_exception_handlers(app):
    """Register all exception handlers with the FastAPI app."""
    app.add_exception_handler(ClientOpsException, clientops_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler_custom)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)