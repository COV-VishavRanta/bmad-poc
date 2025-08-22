"""
Collaboration models for project communication and document management.

This module defines models for project comments, activities, documents,
and notification systems for enhanced project collaboration.
"""

import enum
from typing import List, Optional

from sqlalchemy import (
    JSON,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Boolean,
    LargeBinary,
)
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ActivityType(enum.Enum):
    """Project activity type enumeration."""

    COMMENT = "comment"
    MILESTONE_CREATED = "milestone_created"
    MILESTONE_UPDATED = "milestone_updated"
    MILESTONE_COMPLETED = "milestone_completed"
    ASSIGNMENT_ADDED = "assignment_added"
    ASSIGNMENT_REMOVED = "assignment_removed"
    STATUS_CHANGED = "status_changed"
    DOCUMENT_UPLOADED = "document_uploaded"
    DOCUMENT_UPDATED = "document_updated"
    PROJECT_CREATED = "project_created"
    PROJECT_UPDATED = "project_updated"


class NotificationStatus(enum.Enum):
    """Notification status enumeration."""

    PENDING = "pending"
    SENT = "sent"
    READ = "read"
    DISMISSED = "dismissed"


class ProjectComment(BaseModel):
    """
    Project comment model for discussion and communication.

    Supports threaded comments with mentions and rich content
    for project team collaboration.
    """

    __tablename__ = "project_comments"

    # Foreign keys
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    parent_comment_id = Column(
        Integer, 
        ForeignKey("project_comments.id"), 
        nullable=True, 
        index=True
    )
    
    # Comment content
    content = Column(Text, nullable=False)
    content_type = Column(String(50), default="text")  # text, markdown, html
    
    # Metadata
    mentions = Column(JSON, nullable=True)  # List of mentioned user IDs
    tags = Column(JSON, nullable=True)  # List of tags
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime, nullable=True)
    
    # Visibility and moderation
    is_visible = Column(Boolean, default=True)
    is_pinned = Column(Boolean, default=False)

    # Relationships
    project = relationship("Project", back_populates="comments")
    user = relationship("User", back_populates="project_comments")
    parent_comment = relationship(
        "ProjectComment", 
        remote_side="ProjectComment.id",
        back_populates="replies"
    )
    replies = relationship(
        "ProjectComment", 
        back_populates="parent_comment",
        cascade="all, delete-orphan"
    )

    # Database constraints
    __table_args__ = (
        Index("idx_comments_project_id", "project_id"),
        Index("idx_comments_user_id", "user_id"),
        Index("idx_comments_parent_id", "parent_comment_id"),
        Index("idx_comments_created_at", "created_at"),
        Index("idx_comments_visible", "is_visible"),
    )

    def __repr__(self) -> str:
        """String representation of the ProjectComment."""
        return f"<ProjectComment(id={self.id}, project_id={self.project_id}, user_id={self.user_id})>"

    def get_thread_depth(self) -> int:
        """Calculate the depth of this comment in the thread."""
        depth = 0
        current = self.parent_comment
        while current:
            depth += 1
            current = current.parent_comment
        return depth


class ProjectActivity(BaseModel):
    """
    Project activity model for activity feed and audit trail.

    Records all significant actions and changes within projects
    for timeline tracking and team awareness.
    """

    __tablename__ = "project_activities"

    # Foreign keys
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Activity details
    activity_type = Column(Enum(ActivityType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Activity metadata
    entity_type = Column(String(100), nullable=True)  # milestone, assignment, etc.
    entity_id = Column(Integer, nullable=True)
    activity_metadata = Column(JSON, nullable=True)  # Additional activity data
    
    # Context information
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(255), nullable=True)
    
    # Visibility
    is_visible = Column(Boolean, default=True)
    is_system_generated = Column(Boolean, default=False)

    # Relationships
    project = relationship("Project", back_populates="activities")
    user = relationship("User", back_populates="project_activities")

    # Database constraints
    __table_args__ = (
        Index("idx_activities_project_id", "project_id"),
        Index("idx_activities_user_id", "user_id"),
        Index("idx_activities_type", "activity_type"),
        Index("idx_activities_created_at", "created_at"),
        Index("idx_activities_entity", "entity_type", "entity_id"),
    )

    def __repr__(self) -> str:
        """String representation of the ProjectActivity."""
        return (f"<ProjectActivity(id={self.id}, project_id={self.project_id}, "
                f"type='{self.activity_type.value}')>")


class ProjectDocument(BaseModel):
    """
    Project document model for file management.

    Handles document upload, versioning, and access control
    for project-related files and attachments.
    """

    __tablename__ = "project_documents"

    # Foreign keys
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    folder_id = Column(
        Integer, 
        ForeignKey("document_folders.id"), 
        nullable=True, 
        index=True
    )
    
    # File information
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    mime_type = Column(String(100), nullable=False)
    file_hash = Column(String(64), nullable=True)  # SHA-256 hash
    
    # Version control
    version = Column(Integer, default=1)
    parent_document_id = Column(
        Integer, 
        ForeignKey("project_documents.id"), 
        nullable=True
    )
    
    # Document metadata
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    
    # Access control
    is_public = Column(Boolean, default=False)
    access_level = Column(
        Enum("public", "project_team", "restricted", name="document_access"),
        default="project_team"
    )
    
    # Status
    is_active = Column(Boolean, default=True)
    is_archived = Column(Boolean, default=False)

    # Relationships
    project = relationship("Project", back_populates="documents")
    uploaded_by_user = relationship("User", back_populates="uploaded_documents")
    folder = relationship("DocumentFolder", back_populates="documents")
    parent_document = relationship(
        "ProjectDocument", 
        remote_side="ProjectDocument.id",
        back_populates="versions"
    )
    versions = relationship(
        "ProjectDocument", 
        back_populates="parent_document",
        cascade="all, delete-orphan"
    )

    # Database constraints
    __table_args__ = (
        Index("idx_documents_project_id", "project_id"),
        Index("idx_documents_uploaded_by", "uploaded_by"),
        Index("idx_documents_folder_id", "folder_id"),
        Index("idx_documents_filename", "filename"),
        Index("idx_documents_active", "is_active"),
        Index("idx_documents_version", "version"),
    )

    def __repr__(self) -> str:
        """String representation of the ProjectDocument."""
        return (f"<ProjectDocument(id={self.id}, filename='{self.filename}', "
                f"project_id={self.project_id})>")

    def get_file_size_formatted(self) -> str:
        """Get human-readable file size."""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"


class DocumentFolder(BaseModel):
    """
    Document folder model for organizing project files.

    Provides hierarchical organization of project documents
    with access control and metadata.
    """

    __tablename__ = "document_folders"

    # Foreign keys
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    parent_folder_id = Column(
        Integer, 
        ForeignKey("document_folders.id"), 
        nullable=True, 
        index=True
    )
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Folder information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Organization
    sort_order = Column(Integer, default=0)
    
    # Access control
    access_level = Column(
        Enum("public", "project_team", "restricted", name="folder_access"),
        default="project_team"
    )
    
    # Status
    is_active = Column(Boolean, default=True)

    # Relationships
    project = relationship("Project")
    created_by_user = relationship("User")
    parent_folder = relationship(
        "DocumentFolder", 
        remote_side="DocumentFolder.id",
        back_populates="subfolders"
    )
    subfolders = relationship(
        "DocumentFolder", 
        back_populates="parent_folder",
        cascade="all, delete-orphan"
    )
    documents = relationship(
        "ProjectDocument", 
        back_populates="folder",
        cascade="all, delete-orphan"
    )

    # Database constraints
    __table_args__ = (
        Index("idx_folders_project_id", "project_id"),
        Index("idx_folders_parent_id", "parent_folder_id"),
        Index("idx_folders_name", "name"),
        Index("uk_folder_name_project", "name", "project_id", "parent_folder_id", unique=True),
    )

    def __repr__(self) -> str:
        """String representation of the DocumentFolder."""
        return f"<DocumentFolder(id={self.id}, name='{self.name}', project_id={self.project_id})>"


class ProjectNotification(BaseModel):
    """
    Project notification model for user alerts and updates.

    Manages notifications for project events, mentions,
    and important updates for team members.
    """

    __tablename__ = "project_notifications"

    # Foreign keys
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    triggered_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Notification content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(
        Enum("mention", "milestone", "assignment", "comment", "deadline", "status_change",
             name="notification_type"),
        nullable=False,
        index=True
    )
    
    # Status and delivery
    status = Column(
        Enum(NotificationStatus), 
        nullable=False, 
        default=NotificationStatus.PENDING,
        index=True
    )
    read_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    
    # Context
    entity_type = Column(String(100), nullable=True)  # comment, milestone, etc.
    entity_id = Column(Integer, nullable=True)
    notification_metadata = Column(JSON, nullable=True)
    
    # Delivery preferences
    send_email = Column(Boolean, default=True)
    send_push = Column(Boolean, default=True)

    # Relationships
    project = relationship("Project")
    user = relationship("User", foreign_keys=[user_id])
    triggered_by_user = relationship("User", foreign_keys=[triggered_by])

    # Database constraints
    __table_args__ = (
        Index("idx_notifications_project_id", "project_id"),
        Index("idx_notifications_user_id", "user_id"),
        Index("idx_notifications_status", "status"),
        Index("idx_notifications_type", "notification_type"),
        Index("idx_notifications_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        """String representation of the ProjectNotification."""
        return (f"<ProjectNotification(id={self.id}, user_id={self.user_id}, "
                f"type='{self.notification_type}')>")

    def mark_as_read(self) -> None:
        """Mark notification as read."""
        from datetime import datetime
        self.status = NotificationStatus.READ
        self.read_at = datetime.utcnow()

    def mark_as_sent(self) -> None:
        """Mark notification as sent."""
        from datetime import datetime
        self.status = NotificationStatus.SENT
        self.sent_at = datetime.utcnow()