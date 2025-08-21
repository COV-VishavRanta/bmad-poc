"""
User management schemas for request/response validation.

This module defines Pydantic models for user management operations
including CRUD operations, role changes, and user search/filtering.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, validator

from app.models.user import UserRole, UserStatus


class UserCreateRequest(BaseModel):
    """Schema for user creation request."""

    email: EmailStr = Field(..., description="User email address (unique)")
    full_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="User full name"
    )
    role: UserRole = Field(..., description="User role")
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="User phone number"
    )
    department: Optional[str] = Field(
        None,
        max_length=100,
        description="User department"
    )
    hire_date: Optional[datetime] = Field(
        None,
        description="User hire date"
    )

    class Config:
        """Pydantic configuration."""
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "email": "new.user@example.com",
                "full_name": "John Doe",
                "role": "PC",
                "phone": "+1-555-0123",
                "department": "Engineering",
                "hire_date": "2025-08-21T00:00:00Z"
            }
        }


class UserUpdateRequest(BaseModel):
    """Schema for user update request."""

    full_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="User full name"
    )
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="User phone number"
    )
    department: Optional[str] = Field(
        None,
        max_length=100,
        description="User department"
    )
    hire_date: Optional[datetime] = Field(
        None,
        description="User hire date"
    )

    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "full_name": "John Smith",
                "phone": "+1-555-0456",
                "department": "Product Management",
                "hire_date": "2025-08-21T00:00:00Z"
            }
        }


class UserRoleChangeRequest(BaseModel):
    """Schema for user role change request."""

    role: UserRole = Field(..., description="New user role")

    class Config:
        """Pydantic configuration."""
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "role": "HR"
            }
        }


class UserStatusChangeRequest(BaseModel):
    """Schema for user status change request."""

    status: UserStatus = Field(..., description="New user status")

    class Config:
        """Pydantic configuration."""
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "status": "inactive"
            }
        }


class UserSearchParams(BaseModel):
    """Schema for user search and filtering parameters."""

    search: Optional[str] = Field(
        None,
        max_length=255,
        description="Search in name and email"
    )
    role: Optional[UserRole] = Field(
        None,
        description="Filter by user role"
    )
    status: Optional[UserStatus] = Field(
        None,
        description="Filter by user status"
    )
    page: Optional[int] = Field(
        1,
        ge=1,
        description="Page number (starts from 1)"
    )
    page_size: Optional[int] = Field(
        20,
        ge=1,
        le=100,
        description="Number of items per page"
    )
    sort_by: Optional[str] = Field(
        "created_at",
        pattern="^(full_name|email|role|status|created_at|last_login)$",
        description="Sort field"
    )
    sort_order: Optional[str] = Field(
        "desc",
        pattern="^(asc|desc)$",
        description="Sort order"
    )
    date_from: Optional[datetime] = Field(
        None,
        description="Filter by creation date from"
    )
    date_to: Optional[datetime] = Field(
        None,
        description="Filter by creation date to"
    )

    class Config:
        """Pydantic configuration."""
        use_enum_values = True


class UserDetailResponse(BaseModel):
    """Schema for detailed user information response."""

    id: int = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., description="User full name")
    role: UserRole = Field(..., description="User role")
    status: UserStatus = Field(..., description="User account status")
    phone: Optional[str] = Field(None, description="User phone number")
    department: Optional[str] = Field(None, description="User department")
    hire_date: Optional[datetime] = Field(None, description="User hire date")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        """Pydantic configuration."""
        from_attributes = True
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "user@example.com",
                "full_name": "John Doe",
                "role": "PC",
                "status": "active",
                "phone": "+1-555-0123",
                "department": "Engineering",
                "hire_date": "2025-08-21T00:00:00Z",
                "last_login": "2025-08-21T10:30:00Z",
                "created_at": "2025-08-20T09:00:00Z",
                "updated_at": "2025-08-21T08:15:00Z"
            }
        }


class UserListResponse(BaseModel):
    """Schema for user list response with pagination."""

    status: str = Field(default="success", description="Response status")
    users: List[UserDetailResponse] = Field(..., description="List of users")
    pagination: "PaginationInfo" = Field(..., description="Pagination information")

    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "status": "success",
                "users": [
                    {
                        "id": 1,
                        "email": "user@example.com",
                        "full_name": "John Doe",
                        "role": "PC",
                        "status": "active",
                        "phone": "+1-555-0123",
                        "department": "Engineering",
                        "hire_date": "2025-08-21T00:00:00Z",
                        "last_login": "2025-08-21T10:30:00Z",
                        "created_at": "2025-08-20T09:00:00Z",
                        "updated_at": "2025-08-21T08:15:00Z"
                    }
                ],
                "pagination": {
                    "page": 1,
                    "page_size": 20,
                    "total_items": 25,
                    "total_pages": 2,
                    "has_next": True,
                    "has_previous": False
                }
            }
        }


class PaginationInfo(BaseModel):
    """Schema for pagination information."""

    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_items: int = Field(..., description="Total number of items")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_previous: bool = Field(..., description="Whether there is a previous page")


class UserCreateResponse(BaseModel):
    """Schema for user creation response."""

    status: str = Field(default="success", description="Response status")
    message: str = Field(default="User created successfully", description="Success message")
    user: UserDetailResponse = Field(..., description="Created user information")
    temporary_password: str = Field(..., description="Temporary password for the user")

    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "status": "success",
                "message": "User created successfully",
                "user": {
                    "id": 5,
                    "email": "new.user@example.com",
                    "full_name": "John Doe",
                    "role": "PC",
                    "status": "active",
                    "phone": "+1-555-0123",
                    "department": "Engineering",
                    "hire_date": "2025-08-21T00:00:00Z",
                    "last_login": None,
                    "created_at": "2025-08-21T14:30:00Z",
                    "updated_at": "2025-08-21T14:30:00Z"
                },
                "temporary_password": "TempPass123!"
            }
        }


class UserUpdateResponse(BaseModel):
    """Schema for user update response."""

    status: str = Field(default="success", description="Response status")
    message: str = Field(default="User updated successfully", description="Success message")
    user: UserDetailResponse = Field(..., description="Updated user information")

    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "status": "success",
                "message": "User updated successfully",
                "user": {
                    "id": 1,
                    "email": "user@example.com",
                    "full_name": "John Smith",
                    "role": "PC",
                    "status": "active",
                    "phone": "+1-555-0456",
                    "department": "Product Management",
                    "hire_date": "2025-08-21T00:00:00Z",
                    "last_login": "2025-08-21T10:30:00Z",
                    "created_at": "2025-08-20T09:00:00Z",
                    "updated_at": "2025-08-21T14:45:00Z"
                }
            }
        }


class UserHistoryEntry(BaseModel):
    """Schema for user audit history entry."""

    id: int = Field(..., description="History entry ID")
    action: str = Field(..., description="Action performed")
    changed_fields: List[str] = Field(..., description="Fields that were changed")
    old_values: Optional[dict] = Field(None, description="Previous values")
    new_values: Optional[dict] = Field(None, description="New values")
    changed_by: int = Field(..., description="ID of user who made the change")
    changed_by_name: str = Field(..., description="Name of user who made the change")
    changed_at: datetime = Field(..., description="When the change was made")
    ip_address: Optional[str] = Field(None, description="IP address of the change")
    user_agent: Optional[str] = Field(None, description="User agent of the change")

    class Config:
        """Pydantic configuration."""
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "action": "role_changed",
                "changed_fields": ["role"],
                "old_values": {"role": "PC"},
                "new_values": {"role": "HR"},
                "changed_by": 1,
                "changed_by_name": "Sarah Johnson",
                "changed_at": "2025-08-21T14:30:00Z",
                "ip_address": "192.168.1.100",
                "user_agent": "Mozilla/5.0..."
            }
        }


class UserHistoryResponse(BaseModel):
    """Schema for user history response."""

    status: str = Field(default="success", description="Response status")
    history: List[UserHistoryEntry] = Field(..., description="User audit history")

    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "status": "success",
                "history": [
                    {
                        "id": 1,
                        "action": "role_changed",
                        "changed_fields": ["role"],
                        "old_values": {"role": "PC"},
                        "new_values": {"role": "HR"},
                        "changed_by": 1,
                        "changed_by_name": "Sarah Johnson",
                        "changed_at": "2025-08-21T14:30:00Z",
                        "ip_address": "192.168.1.100",
                        "user_agent": "Mozilla/5.0..."
                    }
                ]
            }
        }


class BulkUserOperation(BaseModel):
    """Schema for bulk user operations."""

    user_ids: List[int] = Field(..., min_length=1, description="List of user IDs")
    operation: str = Field(
        ...,
        pattern="^(activate|deactivate|change_role|send_invitation|reset_password)$",
        description="Operation to perform"
    )
    new_role: Optional[UserRole] = Field(
        None,
        description="New role for role change operation"
    )

    class Config:
        """Pydantic configuration."""
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "user_ids": [1, 2, 3],
                "operation": "change_role",
                "new_role": "HR"
            }
        }


class BulkOperationResult(BaseModel):
    """Schema for individual bulk operation result."""

    user_id: int = Field(..., description="User ID")
    success: bool = Field(..., description="Whether operation succeeded")
    message: str = Field(..., description="Result message")

    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "success": True,
                "message": "User role changed successfully"
            }
        }


class BulkUserOperationResponse(BaseModel):
    """Schema for bulk user operations response."""

    status: str = Field(default="success", description="Response status")
    message: str = Field(..., description="Overall operation message")
    results: List[BulkOperationResult] = Field(..., description="Individual operation results")
    success_count: int = Field(..., description="Number of successful operations")
    failure_count: int = Field(..., description="Number of failed operations")

    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "status": "success",
                "message": "Bulk operation completed",
                "results": [
                    {
                        "user_id": 1,
                        "success": True,
                        "message": "User role changed successfully"
                    },
                    {
                        "user_id": 2,
                        "success": False,
                        "message": "User not found"
                    }
                ],
                "success_count": 1,
                "failure_count": 1
            }
        }


class UserDeactivateResponse(BaseModel):
    """Schema for user deactivation response."""

    status: str = Field(default="success", description="Response status")
    message: str = Field(default="User deactivated successfully", description="Success message")

    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "status": "success",
                "message": "User deactivated successfully"
            }
        }