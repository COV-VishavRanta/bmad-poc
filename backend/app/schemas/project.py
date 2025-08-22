"""
Project schemas for API request/response validation.

This module defines Pydantic schemas for project management endpoints,
including request validation, response serialization, and search parameters.
"""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, validator

from app.models.project import ProjectStatus, ProjectType


class ProjectSearchParams(BaseModel):
    """Schema for project search and filtering parameters."""

    search: Optional[str] = Field(None, description="Search in name and description")
    client_id: Optional[int] = Field(None, description="Filter by client ID")
    status: Optional[ProjectStatus] = Field(None, description="Filter by status")
    project_type: Optional[ProjectType] = Field(None, description="Filter by project type")
    group_id: Optional[int] = Field(None, description="Filter by group ID")
    sow_id: Optional[int] = Field(None, description="Filter by SOW ID")
    start_date_from: Optional[date] = Field(None, description="Filter by start date from")
    start_date_to: Optional[date] = Field(None, description="Filter by start date to")
    end_date_from: Optional[date] = Field(None, description="Filter by end date from")
    end_date_to: Optional[date] = Field(None, description="Filter by end date to")
    page: int = Field(1, ge=1, description="Page number (1-based)")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")
    sort_by: str = Field("name", description="Sort field")
    sort_order: str = Field("asc", pattern="^(asc|desc)$", description="Sort order")

    @validator("start_date_to")
    def validate_start_date_range(cls, v, values):
        """Validate start date range."""
        if v and "start_date_from" in values and values["start_date_from"]:
            if v < values["start_date_from"]:
                raise ValueError("start_date_to must be >= start_date_from")
        return v

    @validator("end_date_to")
    def validate_end_date_range(cls, v, values):
        """Validate end date range."""
        if v and "end_date_from" in values and values["end_date_from"]:
            if v < values["end_date_from"]:
                raise ValueError("end_date_to must be >= end_date_from")
        return v


class ProjectBase(BaseModel):
    """Base schema with common project fields."""

    name: str = Field(..., max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    project_type: ProjectType = Field(..., description="Type of project")
    client_id: int = Field(..., description="Client ID")
    group_id: Optional[int] = Field(None, description="Group ID (optional)")
    sow_id: int = Field(..., description="Statement of Work ID")
    start_date: date = Field(..., description="Project start date")
    end_date: date = Field(..., description="Project end date")

    @validator("end_date")
    def validate_date_order(cls, v, values):
        """Validate that end_date is after start_date."""
        if "start_date" in values and v <= values["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""

    pass


class ProjectUpdate(BaseModel):
    """Schema for updating an existing project."""

    name: Optional[str] = Field(None, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    project_type: Optional[ProjectType] = Field(None, description="Type of project")
    group_id: Optional[int] = Field(None, description="Group ID (optional)")
    sow_id: Optional[int] = Field(None, description="Statement of Work ID")
    start_date: Optional[date] = Field(None, description="Project start date")
    end_date: Optional[date] = Field(None, description="Project end date")

    @validator("end_date")
    def validate_date_order(cls, v, values):
        """Validate that end_date is after start_date."""
        if v and "start_date" in values and values["start_date"] and v <= values["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class ProjectStatusUpdate(BaseModel):
    """Schema for updating project status."""

    status: ProjectStatus = Field(..., description="New project status")


class ProjectResponse(ProjectBase):
    """Schema for project response data."""

    id: int = Field(..., description="Project ID")
    status: ProjectStatus = Field(..., description="Project status")
    created_by: Optional[int] = Field(None, description="Creator user ID")
    created_at: date = Field(..., description="Creation timestamp")
    updated_at: date = Field(..., description="Last update timestamp")

    # Related entity names (for convenience)
    client_name: Optional[str] = Field(None, description="Client name")
    group_name: Optional[str] = Field(None, description="Group name")
    sow_name: Optional[str] = Field(None, description="SOW name")
    creator_name: Optional[str] = Field(None, description="Creator full name")

    class Config:
        """Pydantic configuration."""
        
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Schema for paginated project list response."""

    projects: List[ProjectResponse] = Field(..., description="List of projects")
    total: int = Field(..., description="Total number of projects")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class ProjectDetailResponse(ProjectResponse):
    """Schema for detailed project response with related data."""

    # Assignment summary
    total_fte: float = Field(0.0, description="Total FTE allocated to project")
    active_assignments: int = Field(0, description="Number of active assignments")

    # Status indicators
    is_active: bool = Field(False, description="Whether project is active")
    is_current: bool = Field(False, description="Whether project is within date range")


class ProjectHistoryResponse(BaseModel):
    """Schema for project history entry."""

    id: int = Field(..., description="History entry ID")
    action: str = Field(..., description="Action performed")
    changed_fields: Optional[dict] = Field(None, description="Fields that were changed")
    old_values: Optional[dict] = Field(None, description="Previous values")
    new_values: Optional[dict] = Field(None, description="New values")
    changed_by: Optional[int] = Field(None, description="User who made the change")
    changed_by_name: Optional[str] = Field(None, description="Name of user who made change")
    changed_at: date = Field(..., description="When the change was made")

    class Config:
        """Pydantic configuration."""
        
        from_attributes = True


class ProjectHistoryListResponse(BaseModel):
    """Schema for project history list response."""

    history: List[ProjectHistoryResponse] = Field(..., description="List of history entries")
    total: int = Field(..., description="Total number of history entries")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")