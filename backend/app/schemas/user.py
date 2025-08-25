"""
User-related Pydantic schemas for request/response validation.

This module defines the data models used for API requests and responses
related to user authentication and management.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, validator


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    is_active: bool = True

    @validator('role')
    def validate_role(cls, v):
        """Validate user role is one of the allowed values."""
        allowed_roles = ['HR', 'PC', 'RM']
        if v not in allowed_roles:
            raise ValueError(f'Role must be one of: {", ".join(allowed_roles)}')
        return v


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str

    @validator('password')
    def validate_password(cls, v):
        """Validate password meets minimum requirements."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

    @validator('role')
    def validate_role(cls, v):
        """Validate user role is one of the allowed values."""
        if v is not None:
            allowed_roles = ['HR', 'PC', 'RM']
            if v not in allowed_roles:
                raise ValueError(f'Role must be one of: {", ".join(allowed_roles)}')
        return v


class UserResponse(UserBase):
    """Schema for user response data."""
    id: int
    full_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Schema for login response."""
    user: UserResponse
    message: str = "Login successful"


class LogoutResponse(BaseModel):
    """Schema for logout response."""
    message: str = "Logout successful"


class AuthStatusResponse(BaseModel):
    """Schema for authentication status response."""
    authenticated: bool
    user: Optional[UserResponse] = None