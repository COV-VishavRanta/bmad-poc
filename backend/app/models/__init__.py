"""
Database models package.

This module imports all database models to ensure they are registered
with SQLAlchemy metadata for Alembic migrations and ORM functionality.
"""

from app.models.assignment import (
    Assignment,
    AssignmentHistory,
    AssignmentHistoryAction,
    AssignmentStatus,
)

# Import base model first
from app.models.base import Base, BaseModel
from app.models.client import (
    Client,
    ClientContact,
    ClientHistory,
    ClientHistoryAction,
    ClientStatus,
    RelationType,
)
from app.models.collaboration import (
    ActivityType,
    DocumentFolder,
    NotificationStatus,
    ProjectActivity,
    ProjectComment,
    ProjectDocument,
    ProjectNotification,
)
from app.models.milestone import (
    DependencyType,
    MilestoneAssignee,
    MilestoneDependency,
    MilestoneStatus,
    ProjectMetric,
    ProjectMilestone,
    ProjectTemplate,
)
from app.models.project import (
    Group,
    GroupHistory,
    GroupHistoryAction,
    GroupStatus,
    Project,
    ProjectHistory,
    ProjectHistoryAction,
    ProjectStatus,
    ProjectType,
)
from app.models.sow import SOW, SOWHistory, SOWRole, SOWRoleName, SOWStatus

# Import all models to register them with SQLAlchemy metadata
from app.models.user import User, UserRole, UserSession, UserStatus
from app.models.user_history import UserHistory

# Export all models and enums for easy importing
__all__ = [
    # Base
    "Base",
    "BaseModel",
    # User models
    "User",
    "UserSession",
    "UserHistory",
    "UserRole",
    "UserStatus",
    # Client models
    "Client",
    "ClientContact",
    "ClientHistory",
    "ClientStatus",
    "RelationType",
    "ClientHistoryAction",
    # Project models
    "Project",
    "Group",
    "GroupHistory",
    "ProjectHistory",
    "ProjectType",
    "ProjectStatus",
    "GroupStatus",
    "ProjectHistoryAction",
    "GroupHistoryAction",
    # SOW models
    "SOW",
    "SOWRole",
    "SOWHistory",
    "SOWStatus",
    "SOWRoleName",
    # Assignment models
    "Assignment",
    "AssignmentHistory",
    "AssignmentStatus",
    "AssignmentHistoryAction",
    # Milestone models
    "ProjectMilestone",
    "MilestoneDependency",
    "MilestoneAssignee",
    "ProjectTemplate",
    "ProjectMetric",
    "MilestoneStatus",
    "DependencyType",
    # Collaboration models
    "ProjectComment",
    "ProjectActivity",
    "ProjectDocument",
    "DocumentFolder",
    "ProjectNotification",
    "ActivityType",
    "NotificationStatus",
]
