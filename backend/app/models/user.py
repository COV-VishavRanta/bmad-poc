"""
User model for authentication and role-based access control.

This module defines the User model with authentication fields, role enumeration,
and user session management.
"""

import enum
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, Base


class UserRole(enum.Enum):
    """User role enumeration for access control."""

    HR = "HR"
    PC = "PC"  # Project Coordinator
    RM = "RM"  # Resource Manager


class UserStatus(enum.Enum):
    """User status enumeration."""

    ACTIVE = "active"
    INACTIVE = "inactive"


class User(BaseModel):
    """
    User model for system authentication and authorization.

    Represents system users with role-based access control.
    Includes authentication fields and relationship to user sessions.
    """

    __tablename__ = "users"

    # Authentication fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)

    # Role and status
    role = Column(
        Enum(UserRole, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        index=True,
    )
    status = Column(
        Enum(UserStatus, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=UserStatus.ACTIVE,
        index=True,
    )

    # Additional user information
    phone = Column(String(20), nullable=True)
    department = Column(String(100), nullable=True)
    hire_date = Column(DateTime, nullable=True)

    # Login tracking
    last_login = Column(DateTime, nullable=True)

    # Relationships
    sessions = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )

    created_clients = relationship(
        "Client", back_populates="created_by_user", foreign_keys="Client.created_by"
    )

    created_projects = relationship(
        "Project", back_populates="created_by_user", foreign_keys="Project.created_by"
    )

    created_sows = relationship(
        "SOW", back_populates="created_by_user", foreign_keys="SOW.created_by"
    )

    created_groups = relationship(
        "Group", back_populates="created_by_user", foreign_keys="Group.created_by"
    )

    assignments = relationship(
        "Assignment", back_populates="user", foreign_keys="Assignment.user_id"
    )

    created_assignments = relationship(
        "Assignment",
        back_populates="created_by_user",
        foreign_keys="Assignment.created_by",
    )

    # Advanced features relationships
    assigned_milestones = relationship(
        "ProjectMilestone",
        secondary="milestone_assignees",
        back_populates="assignees"
    )

    project_comments = relationship(
        "ProjectComment", back_populates="user", cascade="all, delete-orphan"
    )

    project_activities = relationship(
        "ProjectActivity", back_populates="user", cascade="all, delete-orphan"
    )

    uploaded_documents = relationship(
        "ProjectDocument", back_populates="uploaded_by_user", cascade="all, delete-orphan"
    )

    # Database indexes
    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_role", "role"),
        Index("idx_users_status", "status"),
    )

    def __repr__(self) -> str:
        """String representation of the User."""
        return f"<User(id={self.id}, email='{self.email}', role='{self.role.value}')>"

    def is_active(self) -> bool:
        """Check if user is active."""
        return self.status == UserStatus.ACTIVE

    def has_role(self, role: UserRole) -> bool:
        """Check if user has specific role."""
        return self.role == role

    def update_last_login(self) -> None:
        """Update the last login timestamp."""
        self.last_login = func.current_timestamp()


class UserSession(Base):
    """
    User session model for authentication tracking.

    Tracks active user sessions with expiration and metadata.
    Note: This model does not inherit from BaseModel because it uses
    session_id as the primary key instead of auto-incrementing id.
    """

    __tablename__ = "user_sessions"

    # Session identification - session_id is the primary key
    session_id = Column(String(255), primary_key=True, autoincrement=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Session lifecycle
    expires_at = Column(DateTime, nullable=False, index=True)
    last_accessed = Column(DateTime, nullable=False, default=func.current_timestamp())

    # Session metadata
    ip_address = Column(String(45), nullable=True)  # Supports IPv6
    user_agent = Column(String(500), nullable=True)

    # Timestamp fields (manually added since not inheriting from BaseModel)
    created_at = Column(
        DateTime,
        nullable=False,
        default=func.current_timestamp(),
        server_default=func.current_timestamp(),
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        server_default=func.current_timestamp(),
    )

    # Relationships
    user = relationship("User", back_populates="sessions")

    # Database indexes
    __table_args__ = (
        Index("idx_sessions_user_id", "user_id"),
        Index("idx_sessions_expires", "expires_at"),
    )

    def __repr__(self) -> str:
        """String representation of the UserSession."""
        return f"<UserSession(session_id='{self.session_id}', user_id={self.user_id})>"

    def is_expired(self) -> bool:
        """Check if session is expired."""
        current_time = datetime.now(timezone.utc)
        # Handle both timezone-aware and naive datetimes for compatibility
        if self.expires_at.tzinfo is None:
            current_time = current_time.replace(tzinfo=None)
        return current_time > self.expires_at

    def is_valid(self) -> bool:
        """Check if session is valid (not expired)."""
        return not self.is_expired()

    def extend_session(self, hours: int = 24) -> None:
        """Extend session expiration by specified hours."""
        from datetime import timedelta

        self.expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)
        self.last_accessed = func.current_timestamp()
