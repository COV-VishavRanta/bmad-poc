"""
Milestone models for project timeline management.

This module defines models for project milestones, dependencies,
and timeline tracking for advanced project management features.
"""

import enum
from typing import List, Optional

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Float,
)
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class MilestoneStatus(enum.Enum):
    """Milestone status enumeration."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class DependencyType(enum.Enum):
    """Project dependency type enumeration."""

    FINISH_TO_START = "finish_to_start"
    START_TO_START = "start_to_start"
    FINISH_TO_FINISH = "finish_to_finish"
    START_TO_FINISH = "start_to_finish"


class ProjectMilestone(BaseModel):
    """
    Project milestone model for timeline tracking.

    Represents key deliverables and checkpoints within projects
    with status tracking and dependency management.
    """

    __tablename__ = "project_milestones"

    # Basic milestone information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Foreign keys
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    
    # Timeline information
    due_date = Column(Date, nullable=False)
    completion_date = Column(Date, nullable=True)
    estimated_hours = Column(Float, nullable=True)
    actual_hours = Column(Float, nullable=True)
    
    # Status and progress
    status = Column(
        Enum(MilestoneStatus), 
        nullable=False, 
        default=MilestoneStatus.PENDING, 
        index=True
    )
    progress_percentage = Column(Integer, default=0)
    
    # Priority and importance
    priority = Column(Integer, default=5)  # 1-10 scale
    is_critical_path = Column(Integer, default=0)  # Boolean as integer
    
    # Additional metadata
    deliverables = Column(JSON, nullable=True)  # List of deliverable items
    acceptance_criteria = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="milestones")
    assignees = relationship(
        "User", 
        secondary="milestone_assignees",
        back_populates="assigned_milestones"
    )
    dependencies_as_successor = relationship(
        "MilestoneDependency", 
        foreign_keys="MilestoneDependency.successor_id",
        back_populates="successor"
    )
    dependencies_as_predecessor = relationship(
        "MilestoneDependency", 
        foreign_keys="MilestoneDependency.predecessor_id",
        back_populates="predecessor"
    )

    # Database constraints
    __table_args__ = (
        Index("idx_milestones_project_id", "project_id"),
        Index("idx_milestones_status", "status"),
        Index("idx_milestones_due_date", "due_date"),
        Index("idx_milestones_critical_path", "is_critical_path"),
        CheckConstraint("progress_percentage >= 0 AND progress_percentage <= 100", 
                       name="chk_milestone_progress_range"),
        CheckConstraint("priority >= 1 AND priority <= 10", 
                       name="chk_milestone_priority_range"),
    )

    def __repr__(self) -> str:
        """String representation of the ProjectMilestone."""
        return f"<ProjectMilestone(id={self.id}, name='{self.name}', status='{self.status.value}')>"

    def is_overdue(self) -> bool:
        """Check if milestone is overdue."""
        from datetime import date
        return (self.status != MilestoneStatus.COMPLETED and 
                self.due_date < date.today())

    def mark_completed(self, completion_date: Optional[Date] = None) -> None:
        """Mark milestone as completed."""
        from datetime import date
        self.status = MilestoneStatus.COMPLETED
        self.completion_date = completion_date or date.today()
        self.progress_percentage = 100

    def calculate_days_remaining(self) -> int:
        """Calculate days remaining until due date."""
        from datetime import date
        if self.status == MilestoneStatus.COMPLETED:
            return 0
        return (self.due_date - date.today()).days


class MilestoneDependency(BaseModel):
    """
    Milestone dependency model for project timeline management.

    Defines relationships between milestones to enforce proper
    scheduling and dependency tracking.
    """

    __tablename__ = "milestone_dependencies"

    # Foreign keys
    predecessor_id = Column(
        Integer, 
        ForeignKey("project_milestones.id"), 
        nullable=False, 
        index=True
    )
    successor_id = Column(
        Integer, 
        ForeignKey("project_milestones.id"), 
        nullable=False, 
        index=True
    )
    
    # Dependency configuration
    dependency_type = Column(
        Enum(DependencyType), 
        nullable=False, 
        default=DependencyType.FINISH_TO_START
    )
    lag_days = Column(Integer, default=0)  # Lag time in days
    
    # Additional metadata
    description = Column(Text, nullable=True)
    is_external = Column(Integer, default=0)  # External dependency flag

    # Relationships
    predecessor = relationship(
        "ProjectMilestone", 
        foreign_keys=[predecessor_id],
        back_populates="dependencies_as_predecessor"
    )
    successor = relationship(
        "ProjectMilestone", 
        foreign_keys=[successor_id],
        back_populates="dependencies_as_successor"
    )

    # Database constraints
    __table_args__ = (
        Index("idx_milestone_deps_predecessor", "predecessor_id"),
        Index("idx_milestone_deps_successor", "successor_id"),
        Index("uk_milestone_dependency", "predecessor_id", "successor_id", unique=True),
        CheckConstraint("predecessor_id != successor_id", 
                       name="chk_milestone_no_self_dependency"),
    )

    def __repr__(self) -> str:
        """String representation of the MilestoneDependency."""
        return (f"<MilestoneDependency(predecessor_id={self.predecessor_id}, "
                f"successor_id={self.successor_id}, type='{self.dependency_type.value}')>")


class MilestoneAssignee(BaseModel):
    """
    Association table for milestone assignees.

    Links milestones to assigned team members with role information.
    """

    __tablename__ = "milestone_assignees"

    # Foreign keys
    milestone_id = Column(
        Integer, 
        ForeignKey("project_milestones.id"), 
        nullable=False, 
        index=True
    )
    user_id = Column(
        Integer, 
        ForeignKey("users.id"), 
        nullable=False, 
        index=True
    )
    
    # Assignment details
    role = Column(String(100), nullable=True)  # Role in this milestone
    responsibility = Column(Text, nullable=True)
    assigned_date = Column(Date, nullable=False)
    
    # Relationships
    milestone = relationship("ProjectMilestone")
    user = relationship("User")

    # Database constraints
    __table_args__ = (
        Index("idx_milestone_assignees_milestone", "milestone_id"),
        Index("idx_milestone_assignees_user", "user_id"),
        Index("uk_milestone_assignee", "milestone_id", "user_id", unique=True),
    )

    def __repr__(self) -> str:
        """String representation of the MilestoneAssignee."""
        return f"<MilestoneAssignee(milestone_id={self.milestone_id}, user_id={self.user_id})>"


class ProjectTemplate(BaseModel):
    """
    Project template model for standardized project creation.

    Defines reusable project templates with predefined milestones,
    roles, and configurations for common project types.
    """

    __tablename__ = "project_templates"

    # Basic template information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    
    # Template configuration
    estimated_duration_days = Column(Integer, nullable=False)
    complexity = Column(
        Enum("simple", "medium", "complex", name="template_complexity"),
        nullable=False,
        default="medium"
    )
    
    # Template content
    milestone_templates = Column(JSON, nullable=True)  # Predefined milestones
    role_templates = Column(JSON, nullable=True)  # Required roles
    default_settings = Column(JSON, nullable=True)  # Default project settings
    
    # Metadata
    tags = Column(JSON, nullable=True)  # Searchable tags
    usage_count = Column(Integer, default=0)
    is_public = Column(Integer, default=1)  # Public/private template
    is_active = Column(Integer, default=1)  # Active/archived
    
    # Creation tracking
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])

    # Database constraints
    __table_args__ = (
        Index("idx_templates_category", "category"),
        Index("idx_templates_complexity", "complexity"),
        Index("idx_templates_active", "is_active"),
        Index("idx_templates_public", "is_public"),
        Index("idx_templates_usage", "usage_count"),
    )

    def __repr__(self) -> str:
        """String representation of the ProjectTemplate."""
        return f"<ProjectTemplate(id={self.id}, name='{self.name}', category='{self.category}')>"

    def increment_usage(self) -> None:
        """Increment the usage counter for this template."""
        self.usage_count += 1

    def is_available_for_user(self, user_id: int) -> bool:
        """Check if template is available for a specific user."""
        return (self.is_active == 1 and 
                (self.is_public == 1 or self.created_by == user_id))


class ProjectMetric(BaseModel):
    """
    Project metrics model for analytics and reporting.

    Stores quantitative metrics about project performance,
    progress, and outcomes for analysis and reporting.
    """

    __tablename__ = "project_metrics"

    # Foreign keys
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    
    # Metric information
    metric_type = Column(
        Enum("duration", "budget", "team_size", "completion_rate", "quality_score",
             "client_satisfaction", "resource_utilization", name="metric_type"),
        nullable=False,
        index=True
    )
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(50), nullable=True)  # days, dollars, percentage, etc.
    
    # Measurement details
    measurement_date = Column(Date, nullable=False, index=True)
    measurement_period = Column(String(50), nullable=True)  # daily, weekly, monthly
    
    # Context and metadata
    category = Column(String(100), nullable=True)
    subcategory = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    metric_metadata = Column(JSON, nullable=True)  # Additional metric data

    # Relationships
    project = relationship("Project", back_populates="metrics")

    # Database constraints
    __table_args__ = (
        Index("idx_metrics_project_id", "project_id"),
        Index("idx_metrics_type", "metric_type"),
        Index("idx_metrics_date", "measurement_date"),
        Index("idx_metrics_project_type_date", "project_id", "metric_type", "measurement_date"),
    )

    def __repr__(self) -> str:
        """String representation of the ProjectMetric."""
        return (f"<ProjectMetric(project_id={self.project_id}, "
                f"type='{self.metric_type}', value={self.metric_value})>")