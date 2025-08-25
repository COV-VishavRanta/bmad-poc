"""
Client management Pydantic schemas.

This module defines request/response schemas for client management operations,
including validation rules and serialization formats.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, field_validator, ConfigDict

from app.models.client import ClientType, ClientStatus, HistoryAction


class ClientBase(BaseModel):
    """Base client schema with common fields."""
    name: str
    client_type: ClientType
    status: ClientStatus = ClientStatus.ACTIVE
    relation_type: str
    project_mgmt_tool: Optional[str] = None
    comments: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate client name is not empty and within length limits."""
        if not v or not v.strip():
            raise ValueError('Client name cannot be empty')
        if len(v.strip()) > 255:
            raise ValueError('Client name cannot exceed 255 characters')
        return v.strip()

    @field_validator('relation_type')
    @classmethod
    def validate_relation_type(cls, v: str) -> str:
        """Validate relation type is not empty."""
        if not v or not v.strip():
            raise ValueError('Relation type is required')
        if len(v.strip()) > 100:
            raise ValueError('Relation type cannot exceed 100 characters')
        return v.strip()


class ClientCreate(ClientBase):
    """Schema for creating a new client."""
    pass


class ClientUpdate(BaseModel):
    """Schema for updating an existing client."""
    name: Optional[str] = None
    client_type: Optional[ClientType] = None
    status: Optional[ClientStatus] = None
    relation_type: Optional[str] = None
    project_mgmt_tool: Optional[str] = None
    comments: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate client name if provided."""
        if v is not None:
            if not v.strip():
                raise ValueError('Client name cannot be empty')
            if len(v.strip()) > 255:
                raise ValueError('Client name cannot exceed 255 characters')
            return v.strip()
        return v

    @field_validator('relation_type')
    @classmethod
    def validate_relation_type(cls, v: Optional[str]) -> Optional[str]:
        """Validate relation type if provided."""
        if v is not None:
            if not v.strip():
                raise ValueError('Relation type cannot be empty')
            if len(v.strip()) > 100:
                raise ValueError('Relation type cannot exceed 100 characters')
            return v.strip()
        return v


class ClientResponse(ClientBase):
    """Schema for client response data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None


class ClientListResponse(BaseModel):
    """Schema for paginated client list response."""
    clients: List[ClientResponse]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool


class ClientHistoryEntry(BaseModel):
    """Schema for client audit history entry."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    action: HistoryAction
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    changed_by: int
    changed_at: datetime


class ClientWithHistory(ClientResponse):
    """Schema for client with audit history."""
    history: List[ClientHistoryEntry] = []


class ClientSearchParams(BaseModel):
    """Schema for client search parameters."""
    page: int = 1
    limit: int = 50
    search: Optional[str] = None
    client_type: Optional[ClientType] = None
    status: Optional[ClientStatus] = None

    @field_validator('page')
    @classmethod
    def validate_page(cls, v: int) -> int:
        """Validate page number is positive."""
        if v < 1:
            raise ValueError('Page number must be positive')
        return v

    @field_validator('limit')
    @classmethod
    def validate_limit(cls, v: int) -> int:
        """Validate limit is within reasonable bounds."""
        if v < 1 or v > 100:
            raise ValueError('Limit must be between 1 and 100')
        return v