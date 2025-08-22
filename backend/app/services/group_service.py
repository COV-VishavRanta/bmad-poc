"""
Group service for business logic and data operations.

This module contains the business logic for group management,
including validation, CRUD operations, search, project assignment, and analytics.
"""

from datetime import date
from typing import Dict, List, Optional, Tuple

from sqlalchemy import and_, desc, or_, asc, func
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.project import Group, GroupHistory, GroupHistoryAction, GroupStatus, Project, ProjectStatus
from app.models.client import Client
from app.models.sow import SOW
from app.models.user import User
from app.schemas.project import (
    GroupCreate,
    GroupUpdate,
    GroupSearchParams,
    GroupStatusUpdate,
    GroupBulkProjectAssignmentRequest,
    GroupBulkProjectAssignmentResponse,
)


class GroupService:
    """Service class for group management operations."""

    def __init__(self, db: Session):
        """Initialize the service with database session."""
        self.db = db

    def create_group(self, group_data: GroupCreate, current_user_id: int) -> Group:
        """
        Create a new group with validation.
        
        Args:
            group_data: Group creation data
            current_user_id: ID of the user creating the group
            
        Returns:
            Created group instance
            
        Raises:
            HTTPException: If validation fails
        """
        # Validate client exists and is active
        client = self.db.query(Client).filter(
            Client.id == group_data.client_id,
            Client.status == "active"
        ).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client not found or inactive"
            )

        # Validate group name uniqueness within client
        existing_group = self.db.query(Group).filter(
            Group.client_id == group_data.client_id,
            Group.name == group_data.name
        ).first()
        if existing_group:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group name must be unique within client"
            )

        # Validate SOW if provided
        if group_data.sow_id:
            sow = self.db.query(SOW).filter(
                SOW.id == group_data.sow_id,
                SOW.status == "active"
            ).first()
            if not sow:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="SOW not found or not active"
                )
            if sow.client_id != group_data.client_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="SOW must belong to the same client as the group"
                )

        # Create the group
        group = Group(
            name=group_data.name,
            description=group_data.description,
            client_id=group_data.client_id,
            sow_id=group_data.sow_id,
            start_date=group_data.start_date,
            end_date=group_data.end_date,
            status=GroupStatus.ACTIVE,
            created_by=current_user_id
        )

        self.db.add(group)
        self.db.flush()  # Get the ID

        # Create history entry
        self._create_history_entry(
            group.id,
            GroupHistoryAction.CREATED,
            current_user_id,
            changed_fields=["all"],
            new_values=self._group_to_dict(group)
        )

        self.db.commit()
        return group

    def get_group(self, group_id: int) -> Optional[Group]:
        """
        Get a group by ID with related data.
        
        Args:
            group_id: Group ID
            
        Returns:
            Group instance or None if not found
        """
        return self.db.query(Group).options(
            joinedload(Group.client),
            joinedload(Group.sow),
            joinedload(Group.created_by_user),
            joinedload(Group.projects).joinedload(Project.assignments)
        ).filter(Group.id == group_id).first()

    def update_group(self, group_id: int, group_data: GroupUpdate, current_user_id: int) -> Group:
        """
        Update an existing group with validation.
        
        Args:
            group_id: ID of the group to update
            group_data: Updated group data
            current_user_id: ID of the user making the update
            
        Returns:
            Updated group instance
            
        Raises:
            HTTPException: If group not found or validation fails
        """
        group = self.get_group(group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        # Store old values for history
        old_values = self._group_to_dict(group)
        changed_fields = []

        # Validate and update name if provided
        if group_data.name is not None:
            if group_data.name != group.name:
                # Check uniqueness within client
                existing_group = self.db.query(Group).filter(
                    Group.client_id == group.client_id,
                    Group.name == group_data.name,
                    Group.id != group_id
                ).first()
                if existing_group:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Group name must be unique within client"
                    )
                group.name = group_data.name
                changed_fields.append("name")

        # Update other fields
        if group_data.description is not None and group_data.description != group.description:
            group.description = group_data.description
            changed_fields.append("description")

        # Validate and update SOW if provided
        if group_data.sow_id is not None and group_data.sow_id != group.sow_id:
            if group_data.sow_id:
                sow = self.db.query(SOW).filter(
                    SOW.id == group_data.sow_id,
                    SOW.status == "active"
                ).first()
                if not sow:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="SOW not found or not active"
                    )
                if sow.client_id != group.client_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="SOW must belong to the same client as the group"
                    )
            group.sow_id = group_data.sow_id
            changed_fields.append("sow_id")

        # Validate and update dates
        if group_data.start_date is not None and group_data.start_date != group.start_date:
            new_start_date = group_data.start_date
            new_end_date = group_data.end_date if group_data.end_date is not None else group.end_date
            
            # Validate date order
            if new_start_date >= new_end_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Start date must be before end date"
                )
            
            # Validate against existing projects
            self._validate_group_date_update(group_id, new_start_date, new_end_date)
            group.start_date = new_start_date
            changed_fields.append("start_date")

        if group_data.end_date is not None and group_data.end_date != group.end_date:
            new_start_date = group_data.start_date if group_data.start_date is not None else group.start_date
            new_end_date = group_data.end_date
            
            # Validate date order
            if new_start_date >= new_end_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Start date must be before end date"
                )
            
            # Validate against existing projects
            self._validate_group_date_update(group_id, new_start_date, new_end_date)
            group.end_date = new_end_date
            changed_fields.append("end_date")

        # Create history entry if changes were made
        if changed_fields:
            new_values = self._group_to_dict(group)
            self._create_history_entry(
                group_id,
                GroupHistoryAction.UPDATED,
                current_user_id,
                changed_fields=changed_fields,
                old_values=old_values,
                new_values=new_values
            )

        self.db.commit()
        return group

    def update_group_status(self, group_id: int, status_data: GroupStatusUpdate, current_user_id: int) -> Group:
        """
        Update group status with validation.
        
        Args:
            group_id: ID of the group to update
            status_data: New status data
            current_user_id: ID of the user making the update
            
        Returns:
            Updated group instance
            
        Raises:
            HTTPException: If group not found or invalid status transition
        """
        group = self.get_group(group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        old_status = group.status
        new_status = status_data.status

        # Validate status transition
        valid_transitions = {
            GroupStatus.ACTIVE: [GroupStatus.COMPLETED, GroupStatus.CANCELLED, GroupStatus.ARCHIVED],
            GroupStatus.COMPLETED: [GroupStatus.ARCHIVED],
            GroupStatus.CANCELLED: [GroupStatus.ARCHIVED],
            GroupStatus.ARCHIVED: []  # Terminal state
        }

        if new_status not in valid_transitions.get(old_status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {old_status.value} to {new_status.value}"
            )

        # Additional validation for specific status changes
        if new_status == GroupStatus.COMPLETED:
            # Check if all projects are completed or cancelled
            active_projects = self.db.query(Project).filter(
                Project.group_id == group_id,
                Project.status.in_([ProjectStatus.PLANNED, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD])
            ).count()
            if active_projects > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot complete group with active projects"
                )

        old_values = {"status": old_status.value}
        group.status = new_status
        new_values = {"status": new_status.value}

        # Create history entry
        self._create_history_entry(
            group_id,
            GroupHistoryAction.STATUS_CHANGED,
            current_user_id,
            changed_fields=["status"],
            old_values=old_values,
            new_values=new_values
        )

        self.db.commit()
        return group

    def delete_group(self, group_id: int, current_user_id: int) -> None:
        """
        Delete a group with validation.
        
        Args:
            group_id: ID of the group to delete
            current_user_id: ID of the user deleting the group
            
        Raises:
            HTTPException: If group not found or has active projects
        """
        group = self.get_group(group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        # Check for active projects
        active_projects = self.db.query(Project).filter(
            Project.group_id == group_id,
            Project.status.in_([ProjectStatus.PLANNED, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD])
        ).count()
        
        if active_projects > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete group with active projects"
            )

        # Create history entry before deletion
        old_values = self._group_to_dict(group)
        self._create_history_entry(
            group_id,
            GroupHistoryAction.DELETED,
            current_user_id,
            changed_fields=["all"],
            old_values=old_values
        )

        # Remove group association from projects
        self.db.query(Project).filter(Project.group_id == group_id).update({"group_id": None})
        
        # Delete the group
        self.db.delete(group)
        self.db.commit()

    def search_groups(self, search_params: GroupSearchParams) -> Tuple[List[Group], int]:
        """
        Search and filter groups with pagination.
        
        Args:
            search_params: Search and filter parameters
            
        Returns:
            Tuple of (groups list, total count)
        """
        query = self.db.query(Group).options(
            joinedload(Group.client),
            joinedload(Group.sow),
            joinedload(Group.created_by_user)
        )

        # Apply filters
        if search_params.search:
            search_term = f"%{search_params.search}%"
            query = query.join(Client).filter(
                or_(
                    Group.name.ilike(search_term),
                    Group.description.ilike(search_term),
                    Client.name.ilike(search_term)
                )
            )

        if search_params.client_id:
            query = query.filter(Group.client_id == search_params.client_id)

        if search_params.sow_id:
            query = query.filter(Group.sow_id == search_params.sow_id)

        if search_params.status:
            query = query.filter(Group.status == search_params.status)

        # Date filters
        if search_params.start_date_from:
            query = query.filter(Group.start_date >= search_params.start_date_from)
        if search_params.start_date_to:
            query = query.filter(Group.start_date <= search_params.start_date_to)
        if search_params.end_date_from:
            query = query.filter(Group.end_date >= search_params.end_date_from)
        if search_params.end_date_to:
            query = query.filter(Group.end_date <= search_params.end_date_to)

        # Project count filters (using subquery)
        if search_params.project_count_min is not None or search_params.project_count_max is not None:
            project_count_subquery = (
                self.db.query(
                    Project.group_id,
                    func.count(Project.id).label('project_count')
                )
                .filter(Project.group_id.isnot(None))
                .group_by(Project.group_id)
                .subquery()
            )
            
            query = query.outerjoin(project_count_subquery, Group.id == project_count_subquery.c.group_id)
            
            if search_params.project_count_min is not None:
                query = query.filter(
                    func.coalesce(project_count_subquery.c.project_count, 0) >= search_params.project_count_min
                )
            if search_params.project_count_max is not None:
                query = query.filter(
                    func.coalesce(project_count_subquery.c.project_count, 0) <= search_params.project_count_max
                )

        # Get total count before pagination
        total = query.count()

        # Apply sorting
        sort_column = getattr(Group, search_params.sort_by, Group.name)
        if search_params.sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Apply pagination
        offset = (search_params.page - 1) * search_params.page_size
        groups = query.offset(offset).limit(search_params.page_size).all()

        return groups, total

    def get_group_projects(self, group_id: int) -> List[Project]:
        """
        Get all projects in a group.
        
        Args:
            group_id: Group ID
            
        Returns:
            List of projects in the group
        """
        return self.db.query(Project).options(
            joinedload(Project.client),
            joinedload(Project.sow),
            joinedload(Project.created_by_user)
        ).filter(Project.group_id == group_id).all()

    def add_project_to_group(self, group_id: int, project_id: int, current_user_id: int) -> Dict[str, any]:
        """
        Add a project to a group with validation.
        
        Args:
            group_id: Group ID
            project_id: Project ID
            current_user_id: ID of the user making the change
            
        Returns:
            Result dictionary with success status and details
            
        Raises:
            HTTPException: If validation fails
        """
        group = self.get_group(group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Validate project belongs to same client
        if project.client_id != group.client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project must belong to the same client as the group"
            )

        # Validate project dates are within group dates
        if not group.validate_project_dates(project.start_date, project.end_date):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project dates ({project.start_date} to {project.end_date}) must be within group dates ({group.start_date} to {group.end_date})"
            )

        # Check if project is already in the group
        if project.group_id == group_id:
            return {"success": False, "message": "Project is already in this group"}

        old_group_id = project.group_id
        project.group_id = group_id

        # Create history entry
        self._create_history_entry(
            group_id,
            GroupHistoryAction.PROJECTS_ADDED,
            current_user_id,
            changed_fields=["projects"],
            old_values={"project_count": group.get_project_count() - 1, "added_project_id": None},
            new_values={"project_count": group.get_project_count(), "added_project_id": project_id},
            change_metadata={"added_projects": [project_id], "removed_from_group": old_group_id}
        )

        self.db.commit()
        return {"success": True, "message": "Project added to group successfully"}

    def remove_project_from_group(self, group_id: int, project_id: int, current_user_id: int) -> Dict[str, any]:
        """
        Remove a project from a group.
        
        Args:
            group_id: Group ID
            project_id: Project ID
            current_user_id: ID of the user making the change
            
        Returns:
            Result dictionary with success status and details
            
        Raises:
            HTTPException: If validation fails
        """
        group = self.get_group(group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        project = self.db.query(Project).filter(
            Project.id == project_id,
            Project.group_id == group_id
        ).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found in this group"
            )

        project.group_id = None

        # Create history entry
        self._create_history_entry(
            group_id,
            GroupHistoryAction.PROJECTS_REMOVED,
            current_user_id,
            changed_fields=["projects"],
            old_values={"project_count": group.get_project_count() + 1, "removed_project_id": project_id},
            new_values={"project_count": group.get_project_count(), "removed_project_id": None},
            change_metadata={"removed_projects": [project_id]}
        )

        self.db.commit()
        return {"success": True, "message": "Project removed from group successfully"}

    def bulk_assign_projects(
        self, 
        group_id: int, 
        assignment_data: GroupBulkProjectAssignmentRequest, 
        current_user_id: int
    ) -> GroupBulkProjectAssignmentResponse:
        """
        Bulk assign/remove projects to/from a group.
        
        Args:
            group_id: Group ID
            assignment_data: Bulk assignment data
            current_user_id: ID of the user making the changes
            
        Returns:
            Response with operation results
        """
        group = self.get_group(group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        response = GroupBulkProjectAssignmentResponse()

        # Process additions
        if assignment_data.add_project_ids:
            for project_id in assignment_data.add_project_ids:
                try:
                    result = self.add_project_to_group(group_id, project_id, current_user_id)
                    if result["success"]:
                        response.added_projects += 1
                    else:
                        response.failed_additions.append({
                            "project_id": project_id,
                            "reason": result["message"]
                        })
                except HTTPException as e:
                    response.failed_additions.append({
                        "project_id": project_id,
                        "reason": e.detail
                    })

        # Process removals
        if assignment_data.remove_project_ids:
            for project_id in assignment_data.remove_project_ids:
                try:
                    result = self.remove_project_from_group(group_id, project_id, current_user_id)
                    if result["success"]:
                        response.removed_projects += 1
                    else:
                        response.failed_removals.append({
                            "project_id": project_id,
                            "reason": result["message"]
                        })
                except HTTPException as e:
                    response.failed_removals.append({
                        "project_id": project_id,
                        "reason": e.detail
                    })

        return response

    def get_group_history(self, group_id: int, page: int = 1, page_size: int = 20) -> Tuple[List[GroupHistory], int]:
        """
        Get group history with pagination.
        
        Args:
            group_id: Group ID
            page: Page number (1-based)
            page_size: Items per page
            
        Returns:
            Tuple of (history entries, total count)
        """
        query = self.db.query(GroupHistory).options(
            joinedload(GroupHistory.changed_by_user)
        ).filter(GroupHistory.group_id == group_id)

        total = query.count()

        offset = (page - 1) * page_size
        history = query.order_by(desc(GroupHistory.changed_at)).offset(offset).limit(page_size).all()

        return history, total

    def calculate_group_analytics(self, group_id: int) -> Dict[str, any]:
        """
        Calculate analytics and statistics for a group.
        
        Args:
            group_id: Group ID
            
        Returns:
            Dictionary with analytics data
        """
        group = self.get_group(group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )

        # Get project statistics
        projects = group.projects
        total_projects = len(projects)
        active_projects = len([p for p in projects if p.status == ProjectStatus.ACTIVE])
        completed_projects = len([p for p in projects if p.status == ProjectStatus.COMPLETED])

        # Calculate FTE allocation
        total_fte = group.calculate_total_fte()

        # Calculate completion percentage
        completion_percentage = (completed_projects / total_projects * 100) if total_projects > 0 else 0

        # Calculate average project duration
        durations = []
        for project in projects:
            duration = (project.end_date - project.start_date).days
            durations.append(duration)
        
        average_duration = sum(durations) / len(durations) if durations else None

        # Assess timeline health
        timeline_health = self._assess_timeline_health(group, projects)

        return {
            "group_id": group_id,
            "project_count": total_projects,
            "active_project_count": active_projects,
            "completed_project_count": completed_projects,
            "total_fte_allocated": total_fte,
            "completion_percentage": round(completion_percentage, 2),
            "average_project_duration": round(average_duration, 1) if average_duration else None,
            "resource_utilization": round(total_fte * 100, 2),  # Simplified calculation
            "timeline_health": timeline_health
        }

    def _validate_group_date_update(self, group_id: int, new_start: date, new_end: date) -> None:
        """
        Validate that group date changes don't violate existing project constraints.
        
        Args:
            group_id: Group ID
            new_start: New start date
            new_end: New end date
            
        Raises:
            HTTPException: If validation fails
        """
        projects = self.db.query(Project).filter(Project.group_id == group_id).all()
        
        for project in projects:
            if new_start > project.start_date or new_end < project.end_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Group date change would violate project '{project.name}' dates ({project.start_date} to {project.end_date})"
                )

    def _create_history_entry(
        self,
        group_id: int,
        action: GroupHistoryAction,
        changed_by: int,
        changed_fields: List[str] = None,
        old_values: Dict = None,
        new_values: Dict = None,
        change_metadata: Dict = None
    ) -> None:
        """Create a history entry for group changes."""
        history = GroupHistory(
            group_id=group_id,
            action=action,
            changed_by=changed_by,
            changed_fields=changed_fields,
            old_values=old_values,
            new_values=new_values,
            change_metadata=change_metadata
        )
        self.db.add(history)

    def _group_to_dict(self, group: Group) -> Dict:
        """Convert group instance to dictionary for history tracking."""
        return {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "client_id": group.client_id,
            "sow_id": group.sow_id,
            "start_date": group.start_date.isoformat() if group.start_date else None,
            "end_date": group.end_date.isoformat() if group.end_date else None,
            "status": group.status.value if group.status else None,
            "created_by": group.created_by
        }

    def _assess_timeline_health(self, group: Group, projects: List[Project]) -> str:
        """
        Assess the timeline health of a group based on project statuses and dates.
        
        Args:
            group: Group instance
            projects: List of projects in the group
            
        Returns:
            Timeline health status string
        """
        if not projects:
            return "no_projects"

        today = date.today()
        overdue_projects = 0
        on_track_projects = 0

        for project in projects:
            if project.status in [ProjectStatus.ACTIVE, ProjectStatus.PLANNED]:
                if project.end_date < today:
                    overdue_projects += 1
                else:
                    on_track_projects += 1

        if overdue_projects == 0:
            return "healthy"
        elif overdue_projects <= len(projects) * 0.2:  # Less than 20% overdue
            return "warning"
        else:
            return "critical"