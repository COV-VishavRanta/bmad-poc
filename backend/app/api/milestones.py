"""
Milestone API endpoints for project timeline management.

This module provides REST API endpoints for milestone creation,
dependency management, and timeline functionality.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.milestone import (
    MilestoneCreate, MilestoneUpdate, MilestoneResponse,
    DependencyCreate, DependencyResponse, ProjectTimelineResponse,
    ProjectAnalyticsResponse, ResourceAllocationResponse,
    ProjectMetricCreate, ProjectMetricResponse
)
from app.services.milestone_service import MilestoneService
from app.services.project_analytics import ProjectAnalyticsService

router = APIRouter(prefix="/api/milestones", tags=["milestones"])
analytics_router = APIRouter(prefix="/api/projects", tags=["project-analytics"])


# Milestone endpoints
@router.post("/", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
def create_milestone(
    milestone_data: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project milestone."""
    try:
        service = MilestoneService(db)
        return service.create_milestone(milestone_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{milestone_id}", response_model=MilestoneResponse)
def get_milestone(
    milestone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a milestone by ID."""
    service = MilestoneService(db)
    milestone = service.get_milestone(milestone_id)
    
    if not milestone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Milestone not found"
        )
    
    return milestone


@router.put("/{milestone_id}", response_model=MilestoneResponse)
def update_milestone(
    milestone_id: int,
    milestone_data: MilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing milestone."""
    service = MilestoneService(db)
    milestone = service.update_milestone(milestone_id, milestone_data)
    
    if not milestone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Milestone not found"
        )
    
    return milestone


@router.delete("/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_milestone(
    milestone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a milestone."""
    try:
        service = MilestoneService(db)
        success = service.delete_milestone(milestone_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found"
            )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{milestone_id}/progress")
def update_milestone_progress(
    milestone_id: int,
    progress_percentage: int = Query(..., ge=0, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update milestone progress percentage."""
    service = MilestoneService(db)
    milestone = service.update_milestone_progress(milestone_id, progress_percentage)
    
    if not milestone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Milestone not found"
        )
    
    return milestone


@router.get("/project/{project_id}", response_model=List[MilestoneResponse])
def get_project_milestones(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all milestones for a project."""
    service = MilestoneService(db)
    return service.get_project_milestones(project_id)


@router.get("/overdue/list", response_model=List[MilestoneResponse])
def get_overdue_milestones(
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overdue milestones."""
    service = MilestoneService(db)
    return service.get_overdue_milestones(project_id)


@router.get("/upcoming/list", response_model=List[MilestoneResponse])
def get_upcoming_milestones(
    days_ahead: int = Query(7, ge=1, le=90),
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get upcoming milestones within specified days."""
    service = MilestoneService(db)
    return service.get_upcoming_milestones(days_ahead, project_id)


# Dependency endpoints
@router.post("/dependencies", response_model=DependencyResponse, status_code=status.HTTP_201_CREATED)
def create_dependency(
    dependency_data: DependencyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a dependency between milestones."""
    try:
        service = MilestoneService(db)
        return service.create_dependency(dependency_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/dependencies/project/{project_id}", response_model=List[DependencyResponse])
def get_project_dependencies(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all dependencies for a project."""
    service = MilestoneService(db)
    return service.get_project_dependencies(project_id)


@router.delete("/dependencies/{dependency_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dependency(
    dependency_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a milestone dependency."""
    service = MilestoneService(db)
    success = service.delete_dependency(dependency_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dependency not found"
        )


# Timeline endpoints
@router.get("/timeline/project/{project_id}", response_model=ProjectTimelineResponse)
def get_project_timeline(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get complete project timeline with milestones and dependencies."""
    service = MilestoneService(db)
    timeline = service.get_project_timeline(project_id)
    
    if not timeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return timeline


# Analytics endpoints
@analytics_router.get("/{project_id}/analytics", response_model=ProjectAnalyticsResponse)
def get_project_analytics(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics for a project."""
    service = ProjectAnalyticsService(db)
    analytics = service.get_project_analytics(project_id)
    
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return analytics


@analytics_router.get("/{project_id}/resource-allocation", response_model=ResourceAllocationResponse)
def get_resource_allocation(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get resource allocation analytics for a project."""
    service = ProjectAnalyticsService(db)
    allocation = service.get_resource_allocation(project_id)
    
    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return allocation


@analytics_router.post("/{project_id}/metrics", response_model=ProjectMetricResponse, status_code=status.HTTP_201_CREATED)
def create_project_metric(
    project_id: int,
    metric_data: ProjectMetricCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project metric."""
    # Ensure project_id matches
    metric_data.project_id = project_id
    
    service = ProjectAnalyticsService(db)
    return service.create_metric(metric_data)


@analytics_router.get("/portfolio/analytics")
def get_portfolio_analytics(
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get portfolio-level analytics across multiple projects."""
    service = ProjectAnalyticsService(db)
    return service.get_portfolio_analytics(client_id)


@analytics_router.get("/team/workload")
def get_team_workload_analysis(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze team workload across date range."""
    from datetime import datetime
    
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    if start > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )
    
    service = ProjectAnalyticsService(db)
    return service.get_team_workload_analysis(start, end)