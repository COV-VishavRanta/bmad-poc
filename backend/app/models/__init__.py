"""
Database models package.

This module imports all database models to ensure they are registered
with SQLAlchemy metadata for Alembic migrations and ORM functionality.
"""

# Import base model first
from app.models.base import BaseModel, Base

# Import all models to register them with SQLAlchemy metadata
from app.models.user import User, UserSession, UserRole, UserStatus
from app.models.client import (
    Client, 
    ClientContact, 
    ClientHistory, 
    ClientStatus, 
    RelationType, 
    ClientHistoryAction
)
from app.models.project import (
    Project, 
    Group, 
    ProjectHistory, 
    ProjectType, 
    ProjectStatus, 
    ProjectHistoryAction
)
from app.models.sow import (
    SOW, 
    SOWRole, 
    SOWHistory, 
    SOWStatus, 
    SOWRoleName
)
from app.models.assignment import (
    Assignment, 
    AssignmentHistory, 
    AssignmentStatus, 
    AssignmentHistoryAction
)

# Export all models and enums for easy importing
__all__ = [
    # Base
    "Base",
    "BaseModel",
    
    # User models
    "User",
    "UserSession", 
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
    "ProjectHistory",
    "ProjectType",
    "ProjectStatus",
    "ProjectHistoryAction",
    
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
]