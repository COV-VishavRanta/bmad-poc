"""
Project schemas for API request/response validation.

This module defines Pydantic schemas for project management endpoints,
including request validation, response serialization, and search parameters.
"""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, validator

from app.models.project import GroupStatus, ProjectStatus, ProjectType


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


# ===== GROUP SCHEMAS =====

class GroupSearchParams(BaseModel):
    """Schema for group search and filtering parameters."""

    search: Optional[str] = Field(None, description="Search in name, description, and client name")
    client_id: Optional[int] = Field(None, description="Filter by client ID")
    sow_id: Optional[int] = Field(None, description="Filter by SOW ID")
    status: Optional[GroupStatus] = Field(None, description="Filter by status")
    start_date_from: Optional[date] = Field(None, description="Filter by start date from")
    start_date_to: Optional[date] = Field(None, description="Filter by start date to")
    end_date_from: Optional[date] = Field(None, description="Filter by end date from")
    end_date_to: Optional[date] = Field(None, description="Filter by end date to")
    project_count_min: Optional[int] = Field(None, ge=0, description="Minimum number of projects")
    project_count_max: Optional[int] = Field(None, ge=0, description="Maximum number of projects")
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

    @validator("project_count_max")
    def validate_project_count_range(cls, v, values):
        """Validate project count range."""
        if v and "project_count_min" in values and values["project_count_min"]:
            if v < values["project_count_min"]:
                raise ValueError("project_count_max must be >= project_count_min")
        return v


class GroupBase(BaseModel):
    """Base schema with common group fields."""

    name: str = Field(..., max_length=255, description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    client_id: int = Field(..., description="Client ID")
    sow_id: Optional[int] = Field(None, description="Statement of Work ID (optional)")
    start_date: date = Field(..., description="Group start date")
    end_date: date = Field(..., description="Group end date")

    @validator("end_date")
    def validate_date_order(cls, v, values):
        """Validate that end_date is after start_date."""
        if "start_date" in values and v <= values["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class GroupCreate(GroupBase):
    """Schema for creating a new group."""

    pass


class GroupUpdate(BaseModel):
    """Schema for updating an existing group."""

    name: Optional[str] = Field(None, max_length=255, description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    sow_id: Optional[int] = Field(None, description="Statement of Work ID (optional)")
    start_date: Optional[date] = Field(None, description="Group start date")
    end_date: Optional[date] = Field(None, description="Group end date")

    @validator("end_date")
    def validate_date_order(cls, v, values):
        """Validate that end_date is after start_date."""
        if v and "start_date" in values and values["start_date"] and v <= values["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class GroupStatusUpdate(BaseModel):
    """Schema for updating group status."""

    status: GroupStatus = Field(..., description="New group status")


class GroupResponse(GroupBase):
    """Schema for group response data."""

    id: int = Field(..., description="Group ID")
    status: GroupStatus = Field(..., description="Group status")
    created_by: Optional[int] = Field(None, description="Creator user ID")
    created_at: date = Field(..., description="Creation timestamp")
    updated_at: date = Field(..., description="Last update timestamp")

    # Related entity names (for convenience)
    client_name: Optional[str] = Field(None, description="Client name")
    sow_name: Optional[str] = Field(None, description="SOW name")
    creator_name: Optional[str] = Field(None, description="Creator full name")

    class Config:
        """Pydantic configuration."""
        
        from_attributes = True


class GroupListResponse(BaseModel):
    """Schema for paginated group list response."""

    groups: List[GroupResponse] = Field(..., description="List of groups")
    total: int = Field(..., description="Total number of groups")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class GroupDetailResponse(GroupResponse):
    """Schema for detailed group response with related data."""

    # Project summary
    project_count: int = Field(0, description="Total number of projects in group")
    active_project_count: int = Field(0, description="Number of active projects in group")
    total_fte: float = Field(0.0, description="Total FTE allocated across all projects")

    # Status indicators
    is_active: bool = Field(False, description="Whether group is active")
    is_current: bool = Field(False, description="Whether group is within date range")

    # Related projects (optional, for detailed view)
    projects: Optional[List[ProjectResponse]] = Field(None, description="Projects in this group")


class GroupProjectAssignmentRequest(BaseModel):
    """Schema for adding/removing projects to/from a group."""

    project_ids: List[int] = Field(..., description="List of project IDs to assign")


class GroupBulkProjectAssignmentRequest(BaseModel):
    """Schema for bulk project assignment operations."""

    add_project_ids: Optional[List[int]] = Field(None, description="Project IDs to add to group")
    remove_project_ids: Optional[List[int]] = Field(None, description="Project IDs to remove from group")


class GroupBulkProjectAssignmentResponse(BaseModel):
    """Schema for bulk project assignment response."""

    added_projects: int = Field(0, description="Number of projects successfully added")
    removed_projects: int = Field(0, description="Number of projects successfully removed")
    failed_additions: List[dict] = Field([], description="Failed project additions with reasons")
    failed_removals: List[dict] = Field([], description="Failed project removals with reasons")
    warnings: List[str] = Field([], description="Validation warnings")


class GroupHistoryResponse(BaseModel):
    """Schema for group history entry."""

    id: int = Field(..., description="History entry ID")
    action: str = Field(..., description="Action performed")
    changed_fields: Optional[dict] = Field(None, description="Fields that were changed")
    old_values: Optional[dict] = Field(None, description="Previous values")
    new_values: Optional[dict] = Field(None, description="New values")
    change_metadata: Optional[dict] = Field(None, description="Additional change context")
    changed_by: Optional[int] = Field(None, description="User who made the change")
    changed_by_name: Optional[str] = Field(None, description="Name of user who made change")
    changed_at: date = Field(..., description="When the change was made")

    class Config:
        """Pydantic configuration."""
        
        from_attributes = True


class GroupHistoryListResponse(BaseModel):
    """Schema for group history list response."""

    history: List[GroupHistoryResponse] = Field(..., description="List of history entries")
    total: int = Field(..., description="Total number of history entries")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class GroupAnalyticsResponse(BaseModel):
    """Schema for group analytics and statistics."""

    group_id: int = Field(..., description="Group ID")
    project_count: int = Field(0, description="Total number of projects")
    active_project_count: int = Field(0, description="Number of active projects")
    completed_project_count: int = Field(0, description="Number of completed projects")
    total_fte_allocated: float = Field(0.0, description="Total FTE allocated")
    completion_percentage: float = Field(0.0, description="Overall completion percentage")
    average_project_duration: Optional[float] = Field(None, description="Average project duration in days")
    resource_utilization: float = Field(0.0, description="Resource utilization percentage")
    timeline_health: str = Field("unknown", description="Timeline health status")

    class Config:
        """Pydantic configuration."""
        
        from_attributes = True