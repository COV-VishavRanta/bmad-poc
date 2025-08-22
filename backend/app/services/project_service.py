"""
Project service for business logic and data operations.

This module contains the business logic for project management,
including validation, CRUD operations, search, and status management.
"""

from datetime import date
from typing import Dict, List, Optional, Tuple

from sqlalchemy import and_, desc, or_, asc
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.project import Project, ProjectHistory, ProjectHistoryAction, ProjectStatus
from app.models.client import Client
from app.models.sow import SOW
from app.models.user import User
from app.models.assignment import Assignment
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectSearchParams,
    ProjectStatusUpdate,
)


class ProjectService:
    """Service class for project management operations."""

    def __init__(self, db: Session):
        """Initialize the service with database session."""
        self.db = db

    def create_project(self, project_data: ProjectCreate, current_user_id: int) -> Project:
        """
        Create a new project with validation.
        
        Args:
            project_data: Project creation data
            current_user_id: ID of the user creating the project
            
        Returns:
            Created project instance
            
        Raises:
            HTTPException: If validation fails
        """
        # Validate client exists and is active
        client = self.db.query(Client).filter(
            Client.id == project_data.client_id,
            Client.is_active == True
        ).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client not found or inactive"
            )

        # Validate SOW exists, is active, and belongs to the same client
        sow = self.db.query(SOW).filter(
            SOW.id == project_data.sow_id,
            SOW.status == "active"
        ).first()
        if not sow:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SOW not found or not active"
            )
        if sow.client_id != project_data.client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SOW must belong to the same client as the project"
            )

        # Validate project name uniqueness within client
        existing_project = self.db.query(Project).filter(
            Project.client_id == project_data.client_id,
            Project.name == project_data.name
        ).first()
        if existing_project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project name must be unique within client"
            )

        # Validate group if provided
        if project_data.group_id:
            from app.models.project import Group
            group = self.db.query(Group).filter(
                Group.id == project_data.group_id,
                Group.client_id == project_data.client_id
            ).first()
            if not group:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Group not found or doesn't belong to the same client"
                )
            
            # Validate project dates are within group dates
            if not (group.start_date <= project_data.start_date and 
                    project_data.end_date <= group.end_date):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Project dates must be within group date range"
                )

        # Create the project
        project = Project(
            name=project_data.name,
            description=project_data.description,
            project_type=project_data.project_type,
            status=ProjectStatus.PLANNED,
            client_id=project_data.client_id,
            group_id=project_data.group_id,
            sow_id=project_data.sow_id,
            start_date=project_data.start_date,
            end_date=project_data.end_date,
            created_by=current_user_id
        )

        self.db.add(project)
        self.db.flush()  # Get the ID

        # Create history entry
        self._create_history_entry(
            project.id,
            ProjectHistoryAction.CREATED,
            current_user_id,
            changed_fields=["all"],
            new_values=self._project_to_dict(project)
        )

        self.db.commit()
        return project

    def get_project(self, project_id: int) -> Optional[Project]:
        """
        Get a project by ID with related data.
        
        Args:
            project_id: Project ID
            
        Returns:
            Project instance or None if not found
        """
        return self.db.query(Project).options(
            joinedload(Project.client),
            joinedload(Project.group),
            joinedload(Project.sow),
            joinedload(Project.created_by_user),
            joinedload(Project.assignments)
        ).filter(Project.id == project_id).first()

    def search_projects(self, search_params: ProjectSearchParams) -> Tuple[List[Project], int]:
        """
        Search and filter projects with pagination.
        
        Args:
            search_params: Search and filter parameters
            
        Returns:
            Tuple of (projects list, total count)
        """
        query = self.db.query(Project).options(
            joinedload(Project.client),
            joinedload(Project.group),
            joinedload(Project.sow),
            joinedload(Project.created_by_user)
        )

        # Apply filters
        if search_params.search:
            search_term = f"%{search_params.search}%"
            query = query.join(Client).filter(
                or_(
                    Project.name.ilike(search_term),
                    Project.description.ilike(search_term),
                    Client.name.ilike(search_term)
                )
            )

        if search_params.client_id:
            query = query.filter(Project.client_id == search_params.client_id)

        if search_params.status:
            query = query.filter(Project.status == search_params.status)

        if search_params.project_type:
            query = query.filter(Project.project_type == search_params.project_type)

        if search_params.group_id:
            query = query.filter(Project.group_id == search_params.group_id)

        if search_params.sow_id:
            query = query.filter(Project.sow_id == search_params.sow_id)

        if search_params.start_date_from:
            query = query.filter(Project.start_date >= search_params.start_date_from)

        if search_params.start_date_to:
            query = query.filter(Project.start_date <= search_params.start_date_to)

        if search_params.end_date_from:
            query = query.filter(Project.end_date >= search_params.end_date_from)

        if search_params.end_date_to:
            query = query.filter(Project.end_date <= search_params.end_date_to)

        # Get total count before pagination
        total = query.count()

        # Apply sorting
        sort_column = getattr(Project, search_params.sort_by, Project.name)
        if search_params.sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Apply pagination
        offset = (search_params.page - 1) * search_params.page_size
        projects = query.offset(offset).limit(search_params.page_size).all()

        return projects, total

    def update_project(self, project_id: int, project_data: ProjectUpdate, current_user_id: int) -> Project:
        """
        Update an existing project with validation.
        
        Args:
            project_id: Project ID to update
            project_data: Updated project data
            current_user_id: ID of the user making the update
            
        Returns:
            Updated project instance
            
        Raises:
            HTTPException: If project not found or validation fails
        """
        project = self.get_project(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Store old values for history
        old_values = self._project_to_dict(project)
        changed_fields = []

        # Validate and update fields
        update_data = project_data.dict(exclude_unset=True)
        
        if "name" in update_data and update_data["name"] != project.name:
            # Validate project name uniqueness within client
            existing_project = self.db.query(Project).filter(
                Project.client_id == project.client_id,
                Project.name == update_data["name"],
                Project.id != project_id
            ).first()
            if existing_project:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Project name must be unique within client"
                )
            project.name = update_data["name"]
            changed_fields.append("name")

        if "description" in update_data:
            project.description = update_data["description"]
            changed_fields.append("description")

        if "project_type" in update_data:
            project.project_type = update_data["project_type"]
            changed_fields.append("project_type")

        if "sow_id" in update_data and update_data["sow_id"] != project.sow_id:
            # Validate SOW
            sow = self.db.query(SOW).filter(
                SOW.id == update_data["sow_id"],
                SOW.status == "active",
                SOW.client_id == project.client_id
            ).first()
            if not sow:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="SOW not found, not active, or doesn't belong to the same client"
                )
            project.sow_id = update_data["sow_id"]
            changed_fields.append("sow_id")

        if "group_id" in update_data:
            if update_data["group_id"] != project.group_id:
                if update_data["group_id"]:
                    # Validate group
                    from app.models.project import Group
                    group = self.db.query(Group).filter(
                        Group.id == update_data["group_id"],
                        Group.client_id == project.client_id
                    ).first()
                    if not group:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Group not found or doesn't belong to the same client"
                        )
                project.group_id = update_data["group_id"]
                changed_fields.append("group_id")

        # Handle date updates with validation
        new_start_date = update_data.get("start_date", project.start_date)
        new_end_date = update_data.get("end_date", project.end_date)
        
        if new_start_date >= new_end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date must be before end_date"
            )

        if "start_date" in update_data and update_data["start_date"] != project.start_date:
            project.start_date = update_data["start_date"]
            changed_fields.append("start_date")

        if "end_date" in update_data and update_data["end_date"] != project.end_date:
            project.end_date = update_data["end_date"]
            changed_fields.append("end_date")

        # Validate group date constraints if group is assigned
        if project.group_id:
            from app.models.project import Group
            group = self.db.query(Group).filter(Group.id == project.group_id).first()
            if group and not (group.start_date <= project.start_date and 
                             project.end_date <= group.end_date):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Project dates must be within group date range"
                )

        if changed_fields:
            # Create history entry
            self._create_history_entry(
                project.id,
                ProjectHistoryAction.UPDATED,
                current_user_id,
                changed_fields=changed_fields,
                old_values={field: old_values[field] for field in changed_fields},
                new_values=self._project_to_dict(project)
            )

        self.db.commit()
        return project

    def update_project_status(self, project_id: int, status_data: ProjectStatusUpdate, current_user_id: int) -> Project:
        """
        Update project status with transition validation.
        
        Args:
            project_id: Project ID to update
            status_data: New status data
            current_user_id: ID of the user making the update
            
        Returns:
            Updated project instance
            
        Raises:
            HTTPException: If project not found or invalid status transition
        """
        project = self.get_project(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        old_status = project.status
        new_status = status_data.status

        # Validate status transition
        if not self._is_valid_status_transition(old_status, new_status):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {old_status.value} to {new_status.value}"
            )

        # Update status
        project.status = new_status

        # Create history entry
        self._create_history_entry(
            project.id,
            ProjectHistoryAction.STATUS_CHANGED,
            current_user_id,
            changed_fields=["status"],
            old_values={"status": old_status.value},
            new_values={"status": new_status.value}
        )

        self.db.commit()
        return project

    def delete_project(self, project_id: int, current_user_id: int) -> bool:
        """
        Delete a project with dependency validation.
        
        Args:
            project_id: Project ID to delete
            current_user_id: ID of the user deleting the project
            
        Returns:
            True if deleted successfully
            
        Raises:
            HTTPException: If project not found or has active dependencies
        """
        project = self.get_project(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Check for active assignments
        active_assignments = self.db.query(Assignment).filter(
            Assignment.project_id == project_id,
            Assignment.status == "active"
        ).count()

        if active_assignments > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete project with active assignments"
            )

        # Create deletion history entry
        self._create_history_entry(
            project.id,
            ProjectHistoryAction.DELETED,
            current_user_id,
            changed_fields=["all"],
            old_values=self._project_to_dict(project)
        )

        # Delete the project (cascade will handle history)
        self.db.delete(project)
        self.db.commit()
        return True

    def get_project_history(self, project_id: int, page: int = 1, page_size: int = 20) -> Tuple[List[ProjectHistory], int]:
        """
        Get project history with pagination.
        
        Args:
            project_id: Project ID
            page: Page number (1-based)
            page_size: Items per page
            
        Returns:
            Tuple of (history entries, total count)
        """
        query = self.db.query(ProjectHistory).options(
            joinedload(ProjectHistory.changed_by_user)
        ).filter(ProjectHistory.project_id == project_id).order_by(desc(ProjectHistory.changed_at))

        total = query.count()
        offset = (page - 1) * page_size
        history = query.offset(offset).limit(page_size).all()

        return history, total

    def _is_valid_status_transition(self, from_status: ProjectStatus, to_status: ProjectStatus) -> bool:
        """
        Check if status transition is valid.
        
        Args:
            from_status: Current status
            to_status: Target status
            
        Returns:
            True if transition is valid
        """
        valid_transitions = {
            ProjectStatus.PLANNED: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
            ProjectStatus.ACTIVE: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
            ProjectStatus.ON_HOLD: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
            ProjectStatus.COMPLETED: [],  # Terminal state
            ProjectStatus.CANCELLED: []   # Terminal state
        }

        return to_status in valid_transitions.get(from_status, [])

    def _create_history_entry(
        self,
        project_id: int,
        action: ProjectHistoryAction,
        user_id: int,
        changed_fields: List[str] = None,
        old_values: Dict = None,
        new_values: Dict = None
    ) -> None:
        """
        Create a project history entry.
        
        Args:
            project_id: Project ID
            action: Action performed
            user_id: User who performed the action
            changed_fields: List of changed field names
            old_values: Dictionary of old values
            new_values: Dictionary of new values
        """
        history = ProjectHistory(
            project_id=project_id,
            action=action,
            changed_by=user_id,
            changed_fields=changed_fields,
            old_values=old_values,
            new_values=new_values
        )
        self.db.add(history)

    def _project_to_dict(self, project: Project) -> Dict:
        """
        Convert project instance to dictionary for history tracking.
        
        Args:
            project: Project instance
            
        Returns:
            Dictionary representation of project
        """
        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "project_type": project.project_type.value if project.project_type else None,
            "status": project.status.value if project.status else None,
            "client_id": project.client_id,
            "group_id": project.group_id,
            "sow_id": project.sow_id,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "created_by": project.created_by
        }