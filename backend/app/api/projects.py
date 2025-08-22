"""
Project management API endpoints.

This module provides REST API endpoints for project management including
CRUD operations, search, filtering, status management, and audit history.
"""

import math
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware import require_auth
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectStatusUpdate,
    ProjectSearchParams,
    ProjectResponse,
    ProjectListResponse,
    ProjectDetailResponse,
    ProjectHistoryListResponse,
    ProjectHistoryResponse,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api/projects", tags=["projects"])


def get_project_service(db: Session = Depends(get_db)) -> ProjectService:
    """Dependency to get project service instance."""
    return ProjectService(db)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    search: str = Query(None, description="Search in name, description, and client name"),
    client_id: int = Query(None, description="Filter by client ID"),
    status: str = Query(None, description="Filter by status"),
    project_type: str = Query(None, description="Filter by project type"),
    group_id: int = Query(None, description="Filter by group ID"),
    sow_id: int = Query(None, description="Filter by SOW ID"),
    start_date_from: str = Query(None, description="Filter by start date from (YYYY-MM-DD)"),
    start_date_to: str = Query(None, description="Filter by start date to (YYYY-MM-DD)"),
    end_date_from: str = Query(None, description="Filter by end date from (YYYY-MM-DD)"),
    end_date_to: str = Query(None, description="Filter by end date to (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("name", description="Sort field"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    project_service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(require_auth)
):
    """
    List projects with search, filtering, and pagination.
    
    Returns a paginated list of projects matching the search criteria.
    """
    try:
        # Convert string dates to date objects
        from datetime import datetime
        
        search_params = ProjectSearchParams(
            search=search,
            client_id=client_id,
            status=status,
            project_type=project_type,
            group_id=group_id,
            sow_id=sow_id,
            start_date_from=datetime.fromisoformat(start_date_from).date() if start_date_from else None,
            start_date_to=datetime.fromisoformat(start_date_to).date() if start_date_to else None,
            end_date_from=datetime.fromisoformat(end_date_from).date() if end_date_from else None,
            end_date_to=datetime.fromisoformat(end_date_to).date() if end_date_to else None,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )

    projects, total = project_service.search_projects(search_params)
    total_pages = math.ceil(total / page_size)

    # Convert to response format with related data
    project_responses = []
    for project in projects:
        project_response = ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            project_type=project.project_type,
            status=project.status,
            client_id=project.client_id,
            group_id=project.group_id,
            sow_id=project.sow_id,
            start_date=project.start_date,
            end_date=project.end_date,
            created_by=project.created_by,
            created_at=project.created_at.date(),
            updated_at=project.updated_at.date(),
            client_name=project.client.name if project.client else None,
            group_name=project.group.name if project.group else None,
            sow_name=project.sow.name if project.sow else None,
            creator_name=project.created_by_user.full_name if project.created_by_user else None
        )
        project_responses.append(project_response)

    return ProjectListResponse(
        projects=project_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    project_service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(require_auth)
):
    """
    Create a new project.
    
    Creates a new project with validation of business rules including
    client existence, SOW validation, and date constraints.
    """
    project = project_service.create_project(project_data, current_user.id)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        project_type=project.project_type,
        status=project.status,
        client_id=project.client_id,
        group_id=project.group_id,
        sow_id=project.sow_id,
        start_date=project.start_date,
        end_date=project.end_date,
        created_by=project.created_by,
        created_at=project.created_at.date(),
        updated_at=project.updated_at.date(),
        client_name=project.client.name if project.client else None,
        group_name=project.group.name if project.group else None,
        sow_name=project.sow.name if project.sow else None,
        creator_name=project.created_by_user.full_name if project.created_by_user else None
    )


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: int,
    project_service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(require_auth)
):
    """
    Get a single project by ID.
    
    Returns detailed project information including related data
    and computed fields like total FTE and status indicators.
    """
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Calculate computed fields
    total_fte = project.get_total_fte()
    active_assignments = len([a for a in project.assignments if a.status == "active"])

    return ProjectDetailResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        project_type=project.project_type,
        status=project.status,
        client_id=project.client_id,
        group_id=project.group_id,
        sow_id=project.sow_id,
        start_date=project.start_date,
        end_date=project.end_date,
        created_by=project.created_by,
        created_at=project.created_at.date(),
        updated_at=project.updated_at.date(),
        client_name=project.client.name if project.client else None,
        group_name=project.group.name if project.group else None,
        sow_name=project.sow.name if project.sow else None,
        creator_name=project.created_by_user.full_name if project.created_by_user else None,
        total_fte=total_fte,
        active_assignments=active_assignments,
        is_active=project.is_active(),
        is_current=project.is_current()
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    project_service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(require_auth)
):
    """
    Update an existing project.
    
    Updates project information with validation of business rules
    and creates an audit trail entry.
    """
    project = project_service.update_project(project_id, project_data, current_user.id)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        project_type=project.project_type,
        status=project.status,
        client_id=project.client_id,
        group_id=project.group_id,
        sow_id=project.sow_id,
        start_date=project.start_date,
        end_date=project.end_date,
        created_by=project.created_by,
        created_at=project.created_at.date(),
        updated_at=project.updated_at.date(),
        client_name=project.client.name if project.client else None,
        group_name=project.group.name if project.group else None,
        sow_name=project.sow.name if project.sow else None,
        creator_name=project.created_by_user.full_name if project.created_by_user else None
    )


@router.put("/{project_id}/status", response_model=ProjectResponse)
async def update_project_status(
    project_id: int,
    status_data: ProjectStatusUpdate,
    project_service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(require_auth)
):
    """
    Update project status.
    
    Updates the project status with validation of allowed transitions
    and creates an audit trail entry.
    """
    project = project_service.update_project_status(project_id, status_data, current_user.id)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        project_type=project.project_type,
        status=project.status,
        client_id=project.client_id,
        group_id=project.group_id,
        sow_id=project.sow_id,
        start_date=project.start_date,
        end_date=project.end_date,
        created_by=project.created_by,
        created_at=project.created_at.date(),
        updated_at=project.updated_at.date(),
        client_name=project.client.name if project.client else None,
        group_name=project.group.name if project.group else None,
        sow_name=project.sow.name if project.sow else None,
        creator_name=project.created_by_user.full_name if project.created_by_user else None
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    project_service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(require_auth)
):
    """
    Delete a project.
    
    Deletes a project with validation that no active assignments exist.
    Creates an audit trail entry before deletion.
    """
    project_service.delete_project(project_id, current_user.id)


@router.get("/{project_id}/history", response_model=ProjectHistoryListResponse)
async def get_project_history(
    project_id: int,
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    project_service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(require_auth)
):
    """
    Get project audit history.
    
    Returns a paginated list of all changes made to the project
    for audit and compliance purposes.
    """
    # Verify project exists
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    history_entries, total = project_service.get_project_history(project_id, page, page_size)
    total_pages = math.ceil(total / page_size)

    # Convert to response format
    history_responses = []
    for entry in history_entries:
        history_response = ProjectHistoryResponse(
            id=entry.id,
            action=entry.action.value,
            changed_fields=entry.changed_fields,
            old_values=entry.old_values,
            new_values=entry.new_values,
            changed_by=entry.changed_by,
            changed_by_name=entry.changed_by_user.full_name if entry.changed_by_user else None,
            changed_at=entry.changed_at.date()
        )
        history_responses.append(history_response)

    return ProjectHistoryListResponse(
        history=history_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )