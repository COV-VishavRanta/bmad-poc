"""
User authentication and authorization models.

This module defines the database models for user management,
including users, roles, and session management.
"""

import enum
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(enum.Enum):
    """Enumeration of user roles in the system."""
    HR = "HR"  # Human Resources - Manage all users, view all projects and client data
    PC = "PC"  # Project Coordinator - Manage projects, view clients, access SOWs
    RM = "RM"  # Resource Manager - Manage resource allocations, view project timelines


class User(Base):
    """
    User model for authentication and authorization.
    
    Represents a user in the system with authentication credentials
    and role-based permissions.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(String(10), nullable=False)  # HR, PC, RM
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship to user sessions
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"

    @property
    def full_name(self) -> str:
        """Get the user's full name."""
        return f"{self.first_name} {self.last_name}"

    def has_permission(self, permission: str) -> bool:
        """
        Check if user has a specific permission based on their role.
        
        Args:
            permission: The permission to check
            
        Returns:
            True if user has the permission, False otherwise
        """
        permissions = get_role_permissions(self.role)
        return permission in permissions


class UserSession(Base):
    """
    User session model for managing authentication sessions.
    
    Tracks active user sessions with secure session tokens
    and automatic expiration.
    """
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to user
    user = relationship("User", back_populates="sessions")

    def __repr__(self) -> str:
        return f"<UserSession(id={self.id}, user_id={self.user_id}, expires_at='{self.expires_at}')>"

    @property
    def is_expired(self) -> bool:
        """Check if the session is expired."""
        return datetime.utcnow() > self.expires_at

    @classmethod
    def create_session_expiry(cls, hours: int = 24) -> datetime:
        """
        Create a session expiry datetime.
        
        Args:
            hours: Number of hours from now for expiry
            
        Returns:
            DateTime object for session expiry
        """
        return datetime.utcnow() + timedelta(hours=hours)


def get_role_permissions(role: str) -> set[str]:
    """
    Get permissions for a specific user role.
    
    Args:
        role: The user role (HR, PC, RM)
        
    Returns:
        Set of permissions for the role
    """
    role_permissions = {
        UserRole.HR.value: {
            "manage_users",
            "view_all_projects",
            "view_all_clients",
            "manage_roles",
            "view_system_settings"
        },
        UserRole.PC.value: {
            "manage_projects",
            "view_clients",
            "access_sows",
            "manage_project_resources"
        },
        UserRole.RM.value: {
            "manage_resource_allocations",
            "view_project_timelines",
            "view_team_data",
            "manage_resource_schedules"
        }
    }
    
    return role_permissions.get(role, set())