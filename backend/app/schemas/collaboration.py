"""
Collaboration schemas for API request/response validation.

This module defines Pydantic schemas for project comments, activities,
documents, and notification functionality.
"""

from datetime import date, datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, validator


class ActivityType(str, Enum):
    """Activity type enumeration."""
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


class NotificationStatus(str, Enum):
    """Notification status enumeration."""
    PENDING = "pending"
    SENT = "sent"
    READ = "read"
    DISMISSED = "dismissed"


class NotificationType(str, Enum):
    """Notification type enumeration."""
    MENTION = "mention"
    MILESTONE = "milestone"
    ASSIGNMENT = "assignment"
    COMMENT = "comment"
    DEADLINE = "deadline"
    STATUS_CHANGE = "status_change"


class DocumentAccess(str, Enum):
    """Document access level enumeration."""
    PUBLIC = "public"
    PROJECT_TEAM = "project_team"
    RESTRICTED = "restricted"


# Comment schemas
class CommentBase(BaseModel):
    """Base comment schema."""
    content: str = Field(..., min_length=1, max_length=10000)
    content_type: str = Field("text", regex="^(text|markdown|html)$")
    mentions: Optional[List[int]] = []
    tags: Optional[List[str]] = []


class CommentCreate(CommentBase):
    """Schema for creating a comment."""
    project_id: int
    parent_comment_id: Optional[int] = None


class CommentUpdate(BaseModel):
    """Schema for updating a comment."""
    content: Optional[str] = Field(None, min_length=1, max_length=10000)
    content_type: Optional[str] = Field(None, regex="^(text|markdown|html)$")
    mentions: Optional[List[int]] = None
    tags: Optional[List[str]] = None
    is_pinned: Optional[bool] = None


class CommentUserResponse(BaseModel):
    """Schema for comment user response."""
    id: int
    full_name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class CommentResponse(CommentBase):
    """Schema for comment response."""
    id: int
    project_id: int
    user: CommentUserResponse
    parent_comment_id: Optional[int] = None
    is_edited: bool
    edited_at: Optional[datetime] = None
    is_visible: bool
    is_pinned: bool
    replies_count: int = 0
    replies: Optional[List['CommentResponse']] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Activity schemas
class ActivityBase(BaseModel):
    """Base activity schema."""
    activity_type: ActivityType
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    activity_metadata: Optional[Dict[str, Any]] = {}


class ActivityCreate(ActivityBase):
    """Schema for creating an activity."""
    project_id: int
    user_id: Optional[int] = None
    is_system_generated: bool = False


class ActivityUserResponse(BaseModel):
    """Schema for activity user response."""
    id: int
    full_name: str
    email: str

    class Config:
        from_attributes = True


class ActivityResponse(ActivityBase):
    """Schema for activity response."""
    id: int
    project_id: int
    user: Optional[ActivityUserResponse] = None
    is_visible: bool
    is_system_generated: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Document schemas
class DocumentBase(BaseModel):
    """Base document schema."""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    tags: Optional[List[str]] = []
    access_level: DocumentAccess = DocumentAccess.PROJECT_TEAM


class DocumentUploadRequest(DocumentBase):
    """Schema for document upload request."""
    project_id: int
    folder_id: Optional[int] = None


class DocumentUpdate(BaseModel):
    """Schema for updating a document."""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    access_level: Optional[DocumentAccess] = None
    folder_id: Optional[int] = None
    is_archived: Optional[bool] = None


class DocumentResponse(DocumentBase):
    """Schema for document response."""
    id: int
    project_id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    version: int
    uploaded_by: int
    uploaded_by_name: str
    folder_id: Optional[int] = None
    folder_name: Optional[str] = None
    is_public: bool
    is_active: bool
    is_archived: bool
    file_size_formatted: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Folder schemas
class FolderBase(BaseModel):
    """Base folder schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    access_level: DocumentAccess = DocumentAccess.PROJECT_TEAM


class FolderCreate(FolderBase):
    """Schema for creating a folder."""
    project_id: int
    parent_folder_id: Optional[int] = None


class FolderUpdate(BaseModel):
    """Schema for updating a folder."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    access_level: Optional[DocumentAccess] = None
    sort_order: Optional[int] = None


class FolderResponse(FolderBase):
    """Schema for folder response."""
    id: int
    project_id: int
    parent_folder_id: Optional[int] = None
    created_by: int
    created_by_name: str
    sort_order: int
    is_active: bool
    subfolders_count: int = 0
    documents_count: int = 0
    subfolders: Optional[List['FolderResponse']] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Notification schemas
class NotificationBase(BaseModel):
    """Base notification schema."""
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    notification_type: NotificationType
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    send_email: bool = True
    send_push: bool = True


class NotificationCreate(NotificationBase):
    """Schema for creating a notification."""
    project_id: int
    user_id: int
    triggered_by: Optional[int] = None
    notification_metadata: Optional[Dict[str, Any]] = {}


class NotificationUpdate(BaseModel):
    """Schema for updating a notification."""
    status: Optional[NotificationStatus] = None
    send_email: Optional[bool] = None
    send_push: Optional[bool] = None


class NotificationUserResponse(BaseModel):
    """Schema for notification user response."""
    id: int
    full_name: str
    email: str

    class Config:
        from_attributes = True


class NotificationResponse(NotificationBase):
    """Schema for notification response."""
    id: int
    project_id: int
    project_name: str
    user: NotificationUserResponse
    triggered_by_user: Optional[NotificationUserResponse] = None
    status: NotificationStatus
    read_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    notification_metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Search and filter schemas
class CommentSearchRequest(BaseModel):
    """Schema for comment search request."""
    project_id: Optional[int] = None
    user_id: Optional[int] = None
    search_text: Optional[str] = None
    tags: Optional[List[str]] = []
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    include_replies: bool = True
    only_pinned: bool = False
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


class ActivitySearchRequest(BaseModel):
    """Schema for activity search request."""
    project_id: Optional[int] = None
    user_id: Optional[int] = None
    activity_types: Optional[List[ActivityType]] = []
    entity_type: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    include_system: bool = True
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


class DocumentSearchRequest(BaseModel):
    """Schema for document search request."""
    project_id: Optional[int] = None
    folder_id: Optional[int] = None
    search_text: Optional[str] = None
    file_types: Optional[List[str]] = []
    tags: Optional[List[str]] = []
    uploaded_by: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    include_archived: bool = False
    access_levels: Optional[List[DocumentAccess]] = []
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


# Batch operations schemas
class BatchCommentAction(BaseModel):
    """Schema for batch comment actions."""
    comment_ids: List[int] = Field(..., min_items=1, max_items=100)
    action: str = Field(..., regex="^(delete|pin|unpin|hide|show)$")


class BatchNotificationAction(BaseModel):
    """Schema for batch notification actions."""
    notification_ids: List[int] = Field(..., min_items=1, max_items=100)
    action: str = Field(..., regex="^(mark_read|mark_unread|dismiss|delete)$")


# Update forward references
CommentResponse.model_rebuild()
FolderResponse.model_rebuild()