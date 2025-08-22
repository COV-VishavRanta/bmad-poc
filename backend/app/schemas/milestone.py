"""
Milestone and timeline schemas for API request/response validation.

This module defines Pydantic schemas for milestone management,
project timelines, and template functionality.
"""

from datetime import date, datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, validator


class MilestoneStatus(str, Enum):
    """Milestone status enumeration."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class DependencyType(str, Enum):
    """Dependency type enumeration."""
    FINISH_TO_START = "finish_to_start"
    START_TO_START = "start_to_start"
    FINISH_TO_FINISH = "finish_to_finish"
    START_TO_FINISH = "start_to_finish"


# Base schemas
class MilestoneBase(BaseModel):
    """Base milestone schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: date
    estimated_hours: Optional[float] = Field(None, ge=0)
    priority: int = Field(5, ge=1, le=10)
    deliverables: Optional[List[str]] = None
    acceptance_criteria: Optional[str] = None
    notes: Optional[str] = None


class MilestoneCreate(MilestoneBase):
    """Schema for creating a milestone."""
    project_id: int
    assignee_ids: Optional[List[int]] = []


class MilestoneUpdate(BaseModel):
    """Schema for updating a milestone."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = Field(None, ge=0)
    actual_hours: Optional[float] = Field(None, ge=0)
    status: Optional[MilestoneStatus] = None
    progress_percentage: Optional[int] = Field(None, ge=0, le=100)
    priority: Optional[int] = Field(None, ge=1, le=10)
    deliverables: Optional[List[str]] = None
    acceptance_criteria: Optional[str] = None
    notes: Optional[str] = None
    assignee_ids: Optional[List[int]] = None


class MilestoneAssigneeResponse(BaseModel):
    """Schema for milestone assignee response."""
    user_id: int
    full_name: str
    email: str
    role: Optional[str] = None
    assigned_date: date

    class Config:
        from_attributes = True


class MilestoneResponse(MilestoneBase):
    """Schema for milestone response."""
    id: int
    project_id: int
    status: MilestoneStatus
    progress_percentage: int
    completion_date: Optional[date] = None
    actual_hours: Optional[float] = None
    is_critical_path: bool
    assignees: List[MilestoneAssigneeResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @validator('is_critical_path', pre=True)
    def convert_critical_path(cls, v):
        """Convert integer to boolean for critical path."""
        return bool(v) if isinstance(v, int) else v


# Dependency schemas
class DependencyBase(BaseModel):
    """Base dependency schema."""
    dependency_type: DependencyType = DependencyType.FINISH_TO_START
    lag_days: int = Field(0, ge=0)
    description: Optional[str] = None


class DependencyCreate(DependencyBase):
    """Schema for creating a dependency."""
    predecessor_id: int
    successor_id: int

    @validator('successor_id')
    def validate_different_milestones(cls, v, values):
        """Ensure predecessor and successor are different."""
        if 'predecessor_id' in values and v == values['predecessor_id']:
            raise ValueError('Predecessor and successor must be different milestones')
        return v


class DependencyResponse(DependencyBase):
    """Schema for dependency response."""
    id: int
    predecessor_id: int
    successor_id: int
    predecessor_name: str
    successor_name: str
    is_external: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Timeline schemas
class ProjectTimelineResponse(BaseModel):
    """Schema for project timeline response."""
    project_id: int
    project_name: str
    start_date: date
    end_date: date
    duration_days: int
    milestones: List[MilestoneResponse] = []
    dependencies: List[DependencyResponse] = []
    critical_path: List[int] = []
    completion_percentage: float

    class Config:
        from_attributes = True


# Template schemas
class TemplateMilestoneBase(BaseModel):
    """Base template milestone schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    duration_offset: int = Field(..., ge=0)  # Days from project start
    estimated_hours: Optional[float] = Field(None, ge=0)
    priority: int = Field(5, ge=1, le=10)
    dependencies: Optional[List[str]] = []  # Milestone names


class TemplateRoleBase(BaseModel):
    """Base template role schema."""
    role_name: str = Field(..., min_length=1, max_length=100)
    fte_allocation: float = Field(..., gt=0, le=1.0)
    start_offset: int = Field(0, ge=0)  # Days from project start
    duration: int = Field(..., gt=0)  # Days


class ProjectTemplateBase(BaseModel):
    """Base project template schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = Field(..., min_length=1, max_length=100)
    estimated_duration_days: int = Field(..., gt=0)
    complexity: str = Field("medium", regex="^(simple|medium|complex)$")
    tags: Optional[List[str]] = []
    is_public: bool = True


class ProjectTemplateCreate(ProjectTemplateBase):
    """Schema for creating a project template."""
    milestone_templates: List[TemplateMilestoneBase] = []
    role_templates: List[TemplateRoleBase] = []
    default_settings: Optional[Dict[str, Any]] = {}


class ProjectTemplateUpdate(BaseModel):
    """Schema for updating a project template."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    estimated_duration_days: Optional[int] = Field(None, gt=0)
    complexity: Optional[str] = Field(None, regex="^(simple|medium|complex)$")
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    milestone_templates: Optional[List[TemplateMilestoneBase]] = None
    role_templates: Optional[List[TemplateRoleBase]] = None
    default_settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ProjectTemplateResponse(ProjectTemplateBase):
    """Schema for project template response."""
    id: int
    milestone_templates: List[TemplateMilestoneBase] = []
    role_templates: List[TemplateRoleBase] = []
    default_settings: Dict[str, Any] = {}
    usage_count: int
    is_active: bool
    created_by: int
    created_by_name: str
    approved_by: Optional[int] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Project creation from template
class ProjectFromTemplateRequest(BaseModel):
    """Schema for creating project from template."""
    template_id: int
    project_name: str = Field(..., min_length=1, max_length=255)
    project_description: Optional[str] = None
    client_id: int
    group_id: Optional[int] = None
    sow_id: int
    start_date: date
    customizations: Optional[Dict[str, Any]] = {}


# Metrics schemas
class MetricType(str, Enum):
    """Metric type enumeration."""
    DURATION = "duration"
    BUDGET = "budget"
    TEAM_SIZE = "team_size"
    COMPLETION_RATE = "completion_rate"
    QUALITY_SCORE = "quality_score"
    CLIENT_SATISFACTION = "client_satisfaction"
    RESOURCE_UTILIZATION = "resource_utilization"


class ProjectMetricBase(BaseModel):
    """Base project metric schema."""
    metric_type: MetricType
    metric_value: float
    metric_unit: Optional[str] = None
    measurement_date: date
    measurement_period: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    notes: Optional[str] = None


class ProjectMetricCreate(ProjectMetricBase):
    """Schema for creating a project metric."""
    project_id: int


class ProjectMetricResponse(ProjectMetricBase):
    """Schema for project metric response."""
    id: int
    project_id: int
    metric_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Analytics schemas
class ProjectAnalyticsResponse(BaseModel):
    """Schema for project analytics response."""
    project_id: int
    project_name: str
    total_milestones: int
    completed_milestones: int
    overdue_milestones: int
    completion_percentage: float
    total_estimated_hours: float
    total_actual_hours: float
    efficiency_ratio: Optional[float] = None
    days_remaining: int
    is_on_track: bool
    risk_level: str  # low, medium, high
    latest_metrics: List[ProjectMetricResponse] = []

    class Config:
        from_attributes = True


class ResourceAllocationResponse(BaseModel):
    """Schema for resource allocation analytics."""
    project_id: int
    project_name: str
    total_fte_allocated: float
    team_members: List[Dict[str, Any]] = []
    allocation_by_role: Dict[str, float] = {}
    utilization_percentage: float
    conflicts: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True