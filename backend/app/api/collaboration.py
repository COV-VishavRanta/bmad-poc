"""
Project collaboration API endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.collaboration import (
    ProjectComment, 
    ProjectActivity, 
    ProjectDocument, 
    DocumentFolder,
    ProjectNotification
)
from ..schemas.collaboration import (
    ProjectCommentCreate,
    ProjectCommentUpdate,
    ProjectCommentResponse,
    ProjectActivityResponse,
    ProjectDocumentCreate,
    ProjectDocumentResponse,
    DocumentFolderCreate,
    DocumentFolderResponse,
    ProjectNotificationResponse
)
from ..core.dependencies import get_current_user
from ..models.user import User
import os
import uuid
from datetime import datetime

router = APIRouter(prefix="/collaboration", tags=["collaboration"])

# Comments endpoints
@router.get("/projects/{project_id}/comments", response_model=List[ProjectCommentResponse])
async def get_project_comments(
    project_id: int,
    parent_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comments for a project."""
    query = db.query(ProjectComment).filter(ProjectComment.project_id == project_id)
    
    if parent_id is not None:
        query = query.filter(ProjectComment.parent_id == parent_id)
    else:
        query = query.filter(ProjectComment.parent_id.is_(None))  # Top-level comments
    
    comments = query.order_by(ProjectComment.created_at.desc()).offset(skip).limit(limit).all()
    return comments

@router.post("/projects/{project_id}/comments", response_model=ProjectCommentResponse)
async def create_comment(
    project_id: int,
    comment_data: ProjectCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new comment on a project."""
    comment = ProjectComment(
        project_id=project_id,
        user_id=current_user.id,
        content=comment_data.content,
        parent_id=comment_data.parent_id
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    # Create activity for comment
    activity = ProjectActivity(
        project_id=project_id,
        user_id=current_user.id,
        action_type='comment_created',
        description=f"Added a comment: {comment_data.content[:50]}...",
        activity_metadata={'comment_id': comment.id}
    )
    db.add(activity)
    db.commit()
    
    return comment

@router.put("/comments/{comment_id}", response_model=ProjectCommentResponse)
async def update_comment(
    comment_id: int,
    comment_data: ProjectCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a comment."""
    comment = db.query(ProjectComment).filter(ProjectComment.id == comment_id).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check ownership
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only edit your own comments"
        )
    
    comment.content = comment_data.content
    comment.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(comment)
    return comment

@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment."""
    comment = db.query(ProjectComment).filter(ProjectComment.id == comment_id).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check ownership
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own comments"
        )
    
    db.delete(comment)
    db.commit()
    
    return {"message": "Comment deleted successfully"}

# Activity endpoints
@router.get("/projects/{project_id}/activity", response_model=List[ProjectActivityResponse])
async def get_project_activity(
    project_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get activity feed for a project."""
    activities = db.query(ProjectActivity).filter(
        ProjectActivity.project_id == project_id
    ).order_by(
        ProjectActivity.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return activities

# Documents endpoints
@router.get("/projects/{project_id}/documents", response_model=List[ProjectDocumentResponse])
async def get_project_documents(
    project_id: int,
    folder_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get documents for a project."""
    query = db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id)
    
    if folder_id is not None:
        query = query.filter(ProjectDocument.folder_id == folder_id)
    
    documents = query.order_by(ProjectDocument.created_at.desc()).offset(skip).limit(limit).all()
    return documents

@router.post("/projects/{project_id}/documents/upload")
async def upload_document(
    project_id: int,
    file: UploadFile = File(...),
    folder_id: Optional[int] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a document to a project."""
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ''
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # Save file (this would typically be to cloud storage)
    file_path = f"uploads/projects/{project_id}/{unique_filename}"
    
    # Create document record
    document = ProjectDocument(
        project_id=project_id,
        folder_id=folder_id,
        name=file.filename or unique_filename,
        file_path=file_path,
        file_size=file.size or 0,
        mime_type=file.content_type or 'application/octet-stream',
        description=description,
        uploaded_by=current_user.id,
        version=1
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Create activity
    activity = ProjectActivity(
        project_id=project_id,
        user_id=current_user.id,
        action_type='document_uploaded',
        description=f"Uploaded document: {file.filename}",
        activity_metadata={'document_id': document.id}
    )
    db.add(activity)
    db.commit()
    
    return {
        "message": "Document uploaded successfully",
        "document_id": document.id,
        "file_path": file_path
    }

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a document."""
    document = db.query(ProjectDocument).filter(ProjectDocument.id == document_id).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check ownership
    if document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own documents"
        )
    
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully"}

# Folders endpoints
@router.get("/projects/{project_id}/folders", response_model=List[DocumentFolderResponse])
async def get_project_folders(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get document folders for a project."""
    folders = db.query(DocumentFolder).filter(
        DocumentFolder.project_id == project_id
    ).order_by(DocumentFolder.name).all()
    
    return folders

@router.post("/projects/{project_id}/folders", response_model=DocumentFolderResponse)
async def create_folder(
    project_id: int,
    folder_data: DocumentFolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new document folder."""
    folder = DocumentFolder(
        project_id=project_id,
        name=folder_data.name,
        description=folder_data.description,
        created_by=current_user.id
    )
    
    db.add(folder)
    db.commit()
    db.refresh(folder)
    
    return folder

# Notifications endpoints
@router.get("/notifications", response_model=List[ProjectNotificationResponse])
async def get_user_notifications(
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notifications for the current user."""
    query = db.query(ProjectNotification).filter(ProjectNotification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(ProjectNotification.read_at.is_(None))
    
    notifications = query.order_by(
        ProjectNotification.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return notifications

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
    notification = db.query(ProjectNotification).filter(
        ProjectNotification.id == notification_id,
        ProjectNotification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Notification marked as read"}

@router.put("/notifications/read-all")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read for the current user."""
    db.query(ProjectNotification).filter(
        ProjectNotification.user_id == current_user.id,
        ProjectNotification.read_at.is_(None)
    ).update({'read_at': datetime.utcnow()})
    
    db.commit()
    
    return {"message": "All notifications marked as read"}

# Real-time endpoints (would typically use WebSockets)
@router.get("/projects/{project_id}/live-activity", response_model=List[ProjectActivityResponse])
async def get_live_activity(
    project_id: int,
    since: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent activity since a specific timestamp for real-time updates."""
    query = db.query(ProjectActivity).filter(ProjectActivity.project_id == project_id)
    
    if since:
        query = query.filter(ProjectActivity.created_at > since)
    
    activities = query.order_by(ProjectActivity.created_at.desc()).limit(20).all()
    return activities