"""
Group management API endpoints.

This module provides REST API endpoints for group management including
CRUD operations, search, filtering, project assignment, analytics, and audit history.
"""

import math
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware import require_auth
from app.models.user import User
from app.schemas.project import (
    GroupCreate,
    GroupUpdate,
    GroupStatusUpdate,
    GroupSearchParams,
    GroupResponse,
    GroupListResponse,
    GroupDetailResponse,
    GroupProjectAssignmentRequest,
    GroupBulkProjectAssignmentRequest,
    GroupBulkProjectAssignmentResponse,
    GroupHistoryListResponse,
    GroupHistoryResponse,
    GroupAnalyticsResponse,
    ProjectResponse,
)
from app.services.group_service import GroupService

router = APIRouter(prefix="/api/groups", tags=["groups"])


def get_group_service(db: Session = Depends(get_db)) -> GroupService:
    """Dependency to get group service instance."""
    return GroupService(db)


@router.get("", response_model=GroupListResponse)
async def list_groups(
    search: str = Query(None, description="Search in name, description, and client name"),
    client_id: int = Query(None, description="Filter by client ID"),
    sow_id: int = Query(None, description="Filter by SOW ID"),
    status: str = Query(None, description="Filter by status"),
    start_date_from: str = Query(None, description="Filter by start date from (YYYY-MM-DD)"),
    start_date_to: str = Query(None, description="Filter by start date to (YYYY-MM-DD)"),
    end_date_from: str = Query(None, description="Filter by end date from (YYYY-MM-DD)"),
    end_date_to: str = Query(None, description="Filter by end date to (YYYY-MM-DD)"),
    project_count_min: int = Query(None, ge=0, description="Minimum number of projects"),
    project_count_max: int = Query(None, ge=0, description="Maximum number of projects"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("name", description="Sort field"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    List groups with search, filtering, and pagination.
    
    Returns a paginated list of groups matching the search criteria.
    """
    try:
        # Convert string dates to date objects
        from datetime import datetime
        
        search_params = GroupSearchParams(
            search=search,
            client_id=client_id,
            sow_id=sow_id,
            status=status,
            start_date_from=datetime.fromisoformat(start_date_from).date() if start_date_from else None,
            start_date_to=datetime.fromisoformat(start_date_to).date() if start_date_to else None,
            end_date_from=datetime.fromisoformat(end_date_from).date() if end_date_from else None,
            end_date_to=datetime.fromisoformat(end_date_to).date() if end_date_to else None,
            project_count_min=project_count_min,
            project_count_max=project_count_max,
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

    groups, total = group_service.search_groups(search_params)
    total_pages = math.ceil(total / page_size)

    # Convert to response format with related data
    group_responses = []
    for group in groups:
        group_response = GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            client_id=group.client_id,
            sow_id=group.sow_id,
            start_date=group.start_date,
            end_date=group.end_date,
            status=group.status,
            created_by=group.created_by,
            created_at=group.created_at.date(),
            updated_at=group.updated_at.date(),
            client_name=group.client.name if group.client else None,
            sow_name=group.sow.name if group.sow else None,
            creator_name=group.created_by_user.full_name if group.created_by_user else None
        )
        group_responses.append(group_response)

    return GroupListResponse(
        groups=group_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate,
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Create a new group.
    
    Creates a group with the provided information and validates:
    - Client exists and is active
    - Group name is unique within the client
    - SOW belongs to the same client (if provided)
    - Date range is valid
    """
    group = group_service.create_group(group_data, current_user.id)
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        client_id=group.client_id,
        sow_id=group.sow_id,
        start_date=group.start_date,
        end_date=group.end_date,
        status=group.status,
        created_by=group.created_by,
        created_at=group.created_at.date(),
        updated_at=group.updated_at.date(),
        client_name=group.client.name if group.client else None,
        sow_name=group.sow.name if group.sow else None,
        creator_name=group.created_by_user.full_name if group.created_by_user else None
    )


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: int,
    include_projects: bool = Query(False, description="Include projects in response"),
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Get a group by ID with optional project details.
    
    Returns detailed group information including analytics and optionally the list of projects.
    """
    group = group_service.get_group(group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Calculate analytics
    analytics = group_service.calculate_group_analytics(group_id)
    
    # Get projects if requested
    projects = None
    if include_projects:
        project_list = group_service.get_group_projects(group_id)
        projects = []
        for project in project_list:
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
                group_name=group.name,
                sow_name=project.sow.name if project.sow else None,
                creator_name=project.created_by_user.full_name if project.created_by_user else None
            )
            projects.append(project_response)

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        client_id=group.client_id,
        sow_id=group.sow_id,
        start_date=group.start_date,
        end_date=group.end_date,
        status=group.status,
        created_by=group.created_by,
        created_at=group.created_at.date(),
        updated_at=group.updated_at.date(),
        client_name=group.client.name if group.client else None,
        sow_name=group.sow.name if group.sow else None,
        creator_name=group.created_by_user.full_name if group.created_by_user else None,
        project_count=analytics["project_count"],
        active_project_count=analytics["active_project_count"],
        total_fte=analytics["total_fte_allocated"],
        is_active=group.is_active(),
        is_current=group.is_current(),
        projects=projects
    )


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group_data: GroupUpdate,
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Update an existing group.
    
    Updates group information with validation:
    - Name uniqueness within client (if changed)
    - SOW belongs to same client (if changed)
    - Date changes don't violate existing project constraints
    """
    group = group_service.update_group(group_id, group_data, current_user.id)
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        client_id=group.client_id,
        sow_id=group.sow_id,
        start_date=group.start_date,
        end_date=group.end_date,
        status=group.status,
        created_by=group.created_by,
        created_at=group.created_at.date(),
        updated_at=group.updated_at.date(),
        client_name=group.client.name if group.client else None,
        sow_name=group.sow.name if group.sow else None,
        creator_name=group.created_by_user.full_name if group.created_by_user else None
    )


@router.patch("/{group_id}/status", response_model=GroupResponse)
async def update_group_status(
    group_id: int,
    status_data: GroupStatusUpdate,
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Update group status.
    
    Updates the group status with validation of valid transitions:
    - active -> completed, cancelled, archived
    - completed -> archived
    - cancelled -> archived
    - archived (terminal state)
    """
    group = group_service.update_group_status(group_id, status_data, current_user.id)
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        client_id=group.client_id,
        sow_id=group.sow_id,
        start_date=group.start_date,
        end_date=group.end_date,
        status=group.status,
        created_by=group.created_by,
        created_at=group.created_at.date(),
        updated_at=group.updated_at.date(),
        client_name=group.client.name if group.client else None,
        sow_name=group.sow.name if group.sow else None,
        creator_name=group.created_by_user.full_name if group.created_by_user else None
    )


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Delete a group.
    
    Deletes the group if no active projects are assigned to it.
    Projects will be unassigned from the group before deletion.
    """
    group_service.delete_group(group_id, current_user.id)


@router.get("/{group_id}/projects", response_model=List[ProjectResponse])
async def get_group_projects(
    group_id: int,
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Get all projects in a group.
    
    Returns a list of all projects assigned to the specified group.
    """
    projects = group_service.get_group_projects(group_id)
    
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
    
    return project_responses


@router.post("/{group_id}/projects/{project_id}")
async def add_project_to_group(
    group_id: int,
    project_id: int,
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Add a project to a group.
    
    Validates:
    - Project belongs to same client as group
    - Project dates are within group date range
    - Project is not already in the group
    """
    result = group_service.add_project_to_group(group_id, project_id, current_user.id)
    return result


@router.delete("/{group_id}/projects/{project_id}")
async def remove_project_from_group(
    group_id: int,
    project_id: int,
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Remove a project from a group.
    
    Removes the project from the group, setting its group_id to null.
    """
    result = group_service.remove_project_from_group(group_id, project_id, current_user.id)
    return result


@router.post("/{group_id}/projects/bulk", response_model=GroupBulkProjectAssignmentResponse)
async def bulk_assign_projects(
    group_id: int,
    assignment_data: GroupBulkProjectAssignmentRequest,
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Bulk assign/remove projects to/from a group.
    
    Allows adding and removing multiple projects in a single operation.
    Returns detailed results including successes and failures.
    """
    return group_service.bulk_assign_projects(group_id, assignment_data, current_user.id)


@router.get("/{group_id}/history", response_model=GroupHistoryListResponse)
async def get_group_history(
    group_id: int,
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Get group audit history.
    
    Returns a paginated list of all changes made to the group for auditing purposes.
    """
    history_entries, total = group_service.get_group_history(group_id, page, page_size)
    total_pages = math.ceil(total / page_size)

    # Convert to response format
    history_responses = []
    for entry in history_entries:
        history_response = GroupHistoryResponse(
            id=entry.id,
            action=entry.action.value,
            changed_fields=entry.changed_fields,
            old_values=entry.old_values,
            new_values=entry.new_values,
            change_metadata=entry.change_metadata,
            changed_by=entry.changed_by,
            changed_by_name=entry.changed_by_user.full_name if entry.changed_by_user else None,
            changed_at=entry.changed_at.date()
        )
        history_responses.append(history_response)

    return GroupHistoryListResponse(
        history=history_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{group_id}/analytics", response_model=GroupAnalyticsResponse)
async def get_group_analytics(
    group_id: int,
    group_service: GroupService = Depends(get_group_service),
    current_user: User = Depends(require_auth)
):
    """
    Get group analytics and statistics.
    
    Returns comprehensive analytics including project counts, FTE allocation,
    completion rates, and timeline health assessment.
    """
    analytics = group_service.calculate_group_analytics(group_id)
    
    return GroupAnalyticsResponse(
        group_id=analytics["group_id"],
        project_count=analytics["project_count"],
        active_project_count=analytics["active_project_count"],
        completed_project_count=analytics["completed_project_count"],
        total_fte_allocated=analytics["total_fte_allocated"],
        completion_percentage=analytics["completion_percentage"],
        average_project_duration=analytics["average_project_duration"],
        resource_utilization=analytics["resource_utilization"],
        timeline_health=analytics["timeline_health"]
    )