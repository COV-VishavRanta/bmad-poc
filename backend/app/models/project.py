"""
Project and Group models for project management.

This module defines the Project, Group, and ProjectHistory models
for managing projects and organizational groupings.
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
)
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ProjectType(enum.Enum):
    """Project type enumeration."""

    DEVELOPMENT = "Development"
    MAINTENANCE = "Maintenance"
    CONSULTING = "Consulting"
    SUPPORT = "Support"


class ProjectStatus(enum.Enum):
    """Project status enumeration."""

    PLANNED = "planned"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class GroupStatus(enum.Enum):
    """Group status enumeration."""

    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"


class ProjectHistoryAction(enum.Enum):
    """Project history action enumeration."""

    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    STATUS_CHANGED = "status_changed"


class GroupHistoryAction(enum.Enum):
    """Group history action enumeration."""

    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    STATUS_CHANGED = "status_changed"
    PROJECTS_ADDED = "projects_added"
    PROJECTS_REMOVED = "projects_removed"


class Group(BaseModel):
    """
    Group model for project organization.

    Represents logical groupings of projects within client organizations.
    Groups help organize related projects under SOWs or business units.
    """

    __tablename__ = "groups"

    # Basic group information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        Enum(GroupStatus), nullable=False, default=GroupStatus.ACTIVE, index=True
    )

    # Foreign keys
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    sow_id = Column(Integer, ForeignKey("sows.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Date range
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="groups")
    sow = relationship("SOW", back_populates="groups")
    projects = relationship("Project", back_populates="group")
    created_by_user = relationship(
        "User", back_populates="created_groups", foreign_keys=[created_by]
    )
    history = relationship(
        "GroupHistory", back_populates="group", cascade="all, delete-orphan"
    )

    # Database constraints
    __table_args__ = (
        Index("idx_groups_client_id", "client_id"),
        Index("idx_groups_sow_id", "sow_id"),
        Index("idx_groups_status", "status"),
        Index("idx_groups_dates", "start_date", "end_date"),
        Index("uk_groups_name_client", "name", "client_id", unique=True),
        CheckConstraint("start_date <= end_date", name="chk_group_date_order"),
    )

    def __repr__(self) -> str:
        """String representation of the Group."""
        return f"<Group(id={self.id}, name='{self.name}', client_id={self.client_id}, status='{self.status.value}')>"

    def is_active(self) -> bool:
        """Check if group is currently active based on status."""
        return self.status == GroupStatus.ACTIVE

    def is_current(self) -> bool:
        """Check if group is within its date range."""
        from datetime import date

        today = date.today()
        return self.start_date <= today <= self.end_date

    def get_active_projects(self) -> List["Project"]:
        """Get all active projects in this group."""
        return [p for p in self.projects if p.status == ProjectStatus.ACTIVE]

    def get_project_count(self) -> int:
        """Get total number of projects in this group."""
        return len(self.projects)

    def calculate_total_fte(self) -> float:
        """Calculate total FTE allocated across all projects in this group."""
        total_fte = 0.0
        for project in self.projects:
            if hasattr(project, 'get_total_fte'):
                total_fte += project.get_total_fte()
        return round(total_fte, 2)

    def validate_project_dates(self, project_start: Date, project_end: Date) -> bool:
        """Validate that project dates fall within group date boundaries."""
        return self.start_date <= project_start and project_end <= self.end_date

    def activate(self) -> None:
        """Activate the group."""
        self.status = GroupStatus.ACTIVE

    def complete(self) -> None:
        """Mark group as completed."""
        self.status = GroupStatus.COMPLETED

    def cancel(self) -> None:
        """Cancel the group."""
        self.status = GroupStatus.CANCELLED

    def archive(self) -> None:
        """Archive the group."""
        self.status = GroupStatus.ARCHIVED


class Project(BaseModel):
    """
    Project model for tracking development and consulting projects.

    Represents individual projects with timeline, status, and relationships
    to clients, groups, SOWs, and team assignments.
    """

    __tablename__ = "projects"

    # Basic project information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    project_type = Column(Enum(ProjectType), nullable=False)
    status = Column(
        Enum(ProjectStatus), nullable=False, default=ProjectStatus.PLANNED, index=True
    )

    # Foreign keys
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True, index=True)
    sow_id = Column(Integer, ForeignKey("sows.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Project timeline
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="projects")
    group = relationship("Group", back_populates="projects")
    sow = relationship("SOW", back_populates="projects")
    created_by_user = relationship(
        "User", back_populates="created_projects", foreign_keys=[created_by]
    )

    assignments = relationship(
        "Assignment", back_populates="project", cascade="all, delete-orphan"
    )

    history = relationship(
        "ProjectHistory", back_populates="project", cascade="all, delete-orphan"
    )

    # Advanced features relationships
    milestones = relationship(
        "ProjectMilestone", back_populates="project", cascade="all, delete-orphan"
    )
    
    metrics = relationship(
        "ProjectMetric", back_populates="project", cascade="all, delete-orphan"
    )
    
    comments = relationship(
        "ProjectComment", back_populates="project", cascade="all, delete-orphan"
    )
    
    activities = relationship(
        "ProjectActivity", back_populates="project", cascade="all, delete-orphan"
    )
    
    documents = relationship(
        "ProjectDocument", back_populates="project", cascade="all, delete-orphan"
    )

    # Database constraints
    __table_args__ = (
        Index("idx_projects_client_id", "client_id"),
        Index("idx_projects_group_id", "group_id"),
        Index("idx_projects_status", "status"),
        Index("idx_projects_dates", "start_date", "end_date"),
        CheckConstraint("start_date <= end_date", name="chk_project_date_order"),
    )

    def __repr__(self) -> str:
        """String representation of the Project."""
        return (
            f"<Project(id={self.id}, name='{self.name}', status='{self.status.value}')>"
        )

    def is_active(self) -> bool:
        """Check if project is currently active."""
        return self.status == ProjectStatus.ACTIVE

    def is_current(self) -> bool:
        """Check if project is within its date range."""
        from datetime import date

        today = date.today()
        return self.start_date <= today <= self.end_date

    def get_total_fte(self) -> float:
        """Calculate total FTE allocated to this project."""
        from sqlalchemy import func

        total = sum(
            assignment.fte_allocation
            for assignment in self.assignments
            if assignment.status == "active"
        )
        return round(total, 2)

    def activate(self) -> None:
        """Activate the project."""
        self.status = ProjectStatus.ACTIVE

    def complete(self) -> None:
        """Mark project as completed."""
        self.status = ProjectStatus.COMPLETED

    def cancel(self) -> None:
        """Cancel the project."""
        self.status = ProjectStatus.CANCELLED


class GroupHistory(BaseModel):
    """
    Group history model for audit trail.

    Tracks all changes made to group records for compliance and auditing.
    """

    __tablename__ = "group_history"

    # Foreign keys
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Change tracking
    action = Column(Enum(GroupHistoryAction), nullable=False, index=True)
    changed_fields = Column(JSON, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    change_metadata = Column(JSON, nullable=True)  # Additional context like added/removed project IDs
    changed_at = Column(
        DateTime, nullable=False, default=BaseModel.created_at.default, index=True
    )

    # Relationships
    group = relationship("Group", back_populates="history")
    changed_by_user = relationship("User")

    # Database indexes
    __table_args__ = (
        Index("idx_group_history_group_id", "group_id"),
        Index("idx_group_history_action", "action"),
        Index("idx_group_history_changed_at", "changed_at"),
    )

    def __repr__(self) -> str:
        """String representation of the GroupHistory."""
        return f"<GroupHistory(id={self.id}, group_id={self.group_id}, action='{self.action.value}')>"


class ProjectHistory(BaseModel):
    """
    Project history model for audit trail.

    Tracks all changes made to project records for compliance and auditing.
    """

    __tablename__ = "project_history"

    # Foreign keys
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Change tracking
    action = Column(Enum(ProjectHistoryAction), nullable=False, index=True)
    changed_fields = Column(JSON, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    changed_at = Column(
        DateTime, nullable=False, default=BaseModel.created_at.default, index=True
    )

    # Relationships
    project = relationship("Project", back_populates="history")
    changed_by_user = relationship("User")

    # Database indexes
    __table_args__ = (
        Index("idx_project_history_project_id", "project_id"),
        Index("idx_project_history_action", "action"),
        Index("idx_project_history_changed_at", "changed_at"),
    )

    def __repr__(self) -> str:
        """String representation of the ProjectHistory."""
        return f"<ProjectHistory(id={self.id}, project_id={self.project_id}, action='{self.action.value}')>"
