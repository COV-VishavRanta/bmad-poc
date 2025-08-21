"""
Client schemas for request/response validation.

This module defines Pydantic schemas for client-related API operations
including validation, serialization, and documentation.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

from app.models.client import ClientStatus, RelationType, ClientHistoryAction


# Base schemas
class ClientContactBase(BaseModel):
    """Base schema for client contact data."""

    name: str = Field(..., min_length=1, max_length=255, description="Contact name")
    email: Optional[EmailStr] = Field(None, description="Contact email address")
    phone: Optional[str] = Field(
        None, max_length=50, description="Contact phone number"
    )
    role: Optional[str] = Field(
        None, max_length=100, description="Contact role/position"
    )
    is_primary: bool = Field(False, description="Whether this is the primary contact")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate phone number format."""
        if v is None:
            return v
        # Remove spaces, dashes, and parentheses
        cleaned = "".join(c for c in v if c.isdigit() or c in "+")
        if len(cleaned) < 10:
            raise ValueError("Phone number must be at least 10 digits")
        return v


class ClientBase(BaseModel):
    """Base schema for client data."""

    name: str = Field(..., min_length=1, max_length=255, description="Client name")
    status: ClientStatus = Field(
        ClientStatus.ACTIVE, description="Client status (active/inactive)"
    )
    relation_type: RelationType = Field(..., description="Client relationship type")
    project_management_tool: Optional[str] = Field(
        None, max_length=100, description="Project management tool preference"
    )
    comments: Optional[str] = Field(None, description="Additional comments")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate client name."""
        if not v.strip():
            raise ValueError("Client name cannot be empty")
        return v.strip()


# Request schemas
class ClientCreateRequest(ClientBase):
    """Schema for creating a new client."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Acme Corporation",
                "status": "active",
                "relation_type": "Customer",
                "project_management_tool": "Jira",
                "comments": "Important client with multiple projects",
            }
        }
    )


class ClientUpdateRequest(BaseModel):
    """Schema for updating an existing client."""

    name: Optional[str] = Field(
        None, min_length=1, max_length=255, description="Client name"
    )
    status: Optional[ClientStatus] = Field(
        None, description="Client status (active/inactive)"
    )
    relation_type: Optional[RelationType] = Field(
        None, description="Client relationship type"
    )
    project_management_tool: Optional[str] = Field(
        None, max_length=100, description="Project management tool preference"
    )
    comments: Optional[str] = Field(None, description="Additional comments")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate client name."""
        if v is not None and not v.strip():
            raise ValueError("Client name cannot be empty")
        return v.strip() if v else None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Updated Client Name",
                "status": "inactive",
                "comments": "Updated comments",
            }
        }
    )


class ClientContactCreateRequest(ClientContactBase):
    """Schema for creating a new client contact."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "John Doe",
                "email": "john.doe@acme.com",
                "phone": "+1-555-123-4567",
                "role": "Project Manager",
                "is_primary": True,
            }
        }
    )


class ClientContactUpdateRequest(BaseModel):
    """Schema for updating an existing client contact."""

    name: Optional[str] = Field(
        None, min_length=1, max_length=255, description="Contact name"
    )
    email: Optional[EmailStr] = Field(None, description="Contact email address")
    phone: Optional[str] = Field(
        None, max_length=50, description="Contact phone number"
    )
    role: Optional[str] = Field(
        None, max_length=100, description="Contact role/position"
    )
    is_primary: Optional[bool] = Field(
        None, description="Whether this is the primary contact"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate phone number format."""
        if v is None:
            return v
        # Remove spaces, dashes, and parentheses
        cleaned = "".join(c for c in v if c.isdigit() or c in "+")
        if len(cleaned) < 10:
            raise ValueError("Phone number must be at least 10 digits")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Jane Smith",
                "email": "jane.smith@acme.com",
                "role": "Technical Lead",
            }
        }
    )


# Response schemas
class ClientContactResponse(ClientContactBase):
    """Schema for client contact response."""

    id: int = Field(..., description="Contact ID")
    client_id: int = Field(..., description="Client ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class ClientResponse(ClientBase):
    """Schema for client response."""

    id: int = Field(..., description="Client ID")
    created_by: Optional[int] = Field(None, description="ID of user who created client")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    contacts: List[ClientContactResponse] = Field(
        default_factory=list, description="Client contacts"
    )

    model_config = ConfigDict(from_attributes=True)


class ClientListResponse(BaseModel):
    """Schema for paginated client list response."""

    clients: List[ClientResponse] = Field(..., description="List of clients")
    total: int = Field(..., description="Total number of clients")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    pages: int = Field(..., description="Total number of pages")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "clients": [],
                "total": 50,
                "page": 1,
                "page_size": 20,
                "pages": 3,
            }
        }
    )


class ClientHistoryResponse(BaseModel):
    """Schema for client history response."""

    id: int = Field(..., description="History record ID")
    client_id: int = Field(..., description="Client ID")
    action: ClientHistoryAction = Field(..., description="Action performed")
    changed_fields: Optional[List[str]] = Field(
        None, description="List of changed fields"
    )
    old_values: Optional[dict] = Field(None, description="Previous values")
    new_values: Optional[dict] = Field(None, description="New values")
    changed_by: Optional[int] = Field(
        None, description="ID of user who made the change"
    )
    changed_at: datetime = Field(..., description="When the change was made")

    model_config = ConfigDict(from_attributes=True)


# Search and filtering schemas
class ClientSearchParams(BaseModel):
    """Schema for client search parameters."""

    search: Optional[str] = Field(
        None, description="Search term for name and comments"
    )
    status: Optional[ClientStatus] = Field(None, description="Filter by status")
    relation_type: Optional[RelationType] = Field(
        None, description="Filter by relation type"
    )
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(
        "name", description="Sort field (name, created_at, updated_at)"
    )
    sort_order: Optional[str] = Field(
        "asc", description="Sort order (asc, desc)"
    )

    @field_validator("sort_by")
    @classmethod
    def validate_sort_by(cls, v: Optional[str]) -> Optional[str]:
        """Validate sort field."""
        allowed_fields = ["name", "created_at", "updated_at", "status", "relation_type"]
        if v and v not in allowed_fields:
            raise ValueError(f"Sort field must be one of: {', '.join(allowed_fields)}")
        return v

    @field_validator("sort_order")
    @classmethod
    def validate_sort_order(cls, v: Optional[str]) -> Optional[str]:
        """Validate sort order."""
        if v and v.lower() not in ["asc", "desc"]:
            raise ValueError("Sort order must be 'asc' or 'desc'")
        return v.lower() if v else "asc"

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "search": "acme",
                "status": "active",
                "relation_type": "Customer",
                "page": 1,
                "page_size": 20,
                "sort_by": "name",
                "sort_order": "asc",
            }
        }
    )


# Error response schemas
class FieldError(BaseModel):
    """Schema for field-level validation errors."""

    field: str = Field(..., description="Field name")
    message: str = Field(..., description="Error message")


class ClientError(BaseModel):
    """Schema for client-specific error responses."""

    status: str = Field("error", description="Status indicator")
    message: str = Field(..., description="Error message")
    code: str = Field(..., description="Error code")
    details: Optional[dict] = Field(None, description="Additional error details")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "error",
                "message": "Validation failed",
                "code": "CLIENT_001",
                "details": {
                    "field_errors": {
                        "name": ["Client name already exists"],
                        "email": ["Invalid email format"],
                    }
                },
            }
        }
    )


# Success response schemas
class ClientDeleteResponse(BaseModel):
    """Schema for client deletion response."""

    status: str = Field("success", description="Status indicator")
    message: str = Field(..., description="Success message")
    client_id: int = Field(..., description="Deleted client ID")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "success",
                "message": "Client deleted successfully",
                "client_id": 123,
            }
        }
    )