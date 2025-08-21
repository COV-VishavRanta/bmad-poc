"""
Authentication schemas for request/response validation.

This module defines Pydantic models for authentication-related API
endpoints including login, logout, user info, and session management.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, validator

from app.models.user import UserRole, UserStatus


class LoginRequest(BaseModel):
    """Schema for user login request."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="User password",
    )

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "email": "hr@example.com",
                "password": "TempPass123!",
            }
        }


class LoginResponse(BaseModel):
    """Schema for successful login response."""

    status: str = Field(default="success", description="Response status")
    message: str = Field(default="Login successful", description="Success message")
    user: "UserResponse" = Field(..., description="User information")

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "status": "success",
                "message": "Login successful",
                "user": {
                    "id": 1,
                    "email": "hr@example.com",
                    "full_name": "Sarah Johnson",
                    "role": "HR",
                    "status": "active",
                    "last_login": "2025-08-21T10:30:00Z",
                },
            }
        }


class LogoutResponse(BaseModel):
    """Schema for logout response."""

    status: str = Field(default="success", description="Response status")
    message: str = Field(default="Logout successful", description="Success message")

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "status": "success",
                "message": "Logout successful",
            }
        }


class UserResponse(BaseModel):
    """Schema for user information in responses."""

    id: int = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., description="User full name")
    role: UserRole = Field(..., description="User role")
    status: UserStatus = Field(..., description="User account status")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")

    class Config:
        """Pydantic configuration."""

        from_attributes = True
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "hr@example.com",
                "full_name": "Sarah Johnson",
                "role": "HR",
                "status": "active",
                "last_login": "2025-08-21T10:30:00Z",
            }
        }


class CurrentUserResponse(BaseModel):
    """Schema for current user info response."""

    status: str = Field(default="success", description="Response status")
    user: UserResponse = Field(..., description="Current user information")

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "status": "success",
                "user": {
                    "id": 1,
                    "email": "hr@example.com",
                    "full_name": "Sarah Johnson",
                    "role": "HR",
                    "status": "active",
                    "last_login": "2025-08-21T10:30:00Z",
                },
            }
        }


class RefreshSessionResponse(BaseModel):
    """Schema for session refresh response."""

    status: str = Field(default="success", description="Response status")
    message: str = Field(
        default="Session refreshed successfully", description="Success message"
    )

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "status": "success",
                "message": "Session refreshed successfully",
            }
        }


class ChangePasswordRequest(BaseModel):
    """Schema for password change request."""

    current_password: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Current password for verification",
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=255,
        description="New password to set",
    )

    @validator("new_password")
    def validate_password_strength(cls, v):
        """Validate new password meets strength requirements."""
        from app.utils.security import is_password_strong

        is_strong, issues = is_password_strong(v)
        if not is_strong:
            raise ValueError(f"Password requirements not met: {', '.join(issues)}")
        return v

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "current_password": "OldPass123!",
                "new_password": "NewPass123!",
            }
        }


class ChangePasswordResponse(BaseModel):
    """Schema for password change response."""

    status: str = Field(default="success", description="Response status")
    message: str = Field(
        default="Password changed successfully", description="Success message"
    )

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "status": "success",
                "message": "Password changed successfully",
            }
        }


class ErrorResponse(BaseModel):
    """Schema for error responses."""

    status: str = Field(default="error", description="Response status")
    message: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code for client handling")

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "status": "error",
                "message": "Invalid email or password",
                "code": "AUTH_001",
            }
        }


class SessionInfo(BaseModel):
    """Schema for session information."""

    session_id: str = Field(..., description="Session ID (masked)")
    expires_at: datetime = Field(..., description="Session expiration time")
    last_accessed: datetime = Field(..., description="Last access time")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")

    class Config:
        """Pydantic configuration."""

        orm_mode = True
        schema_extra = {
            "example": {
                "session_id": "abcd****7890",
                "expires_at": "2025-08-22T10:30:00Z",
                "last_accessed": "2025-08-21T15:45:00Z",
                "ip_address": "192.168.1.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            }
        }


class UserSessionsResponse(BaseModel):
    """Schema for user sessions list response."""

    status: str = Field(default="success", description="Response status")
    sessions: list[SessionInfo] = Field(..., description="List of active sessions")

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "status": "success",
                "sessions": [
                    {
                        "session_id": "abcd****7890",
                        "expires_at": "2025-08-22T10:30:00Z",
                        "last_accessed": "2025-08-21T15:45:00Z",
                        "ip_address": "192.168.1.1",
                        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    }
                ],
            }
        }