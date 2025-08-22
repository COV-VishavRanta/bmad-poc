"""
Milestone service for project timeline management.

This module provides services for milestone creation, dependency management,
and timeline functionality for advanced project management.
"""

from datetime import date, datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy import and_, or_, desc, asc
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from app.models import (
    Project, ProjectMilestone, MilestoneDependency, MilestoneAssignee,
    User, MilestoneStatus, DependencyType
)
from app.schemas.milestone import (
    MilestoneCreate, MilestoneUpdate, MilestoneResponse,
    DependencyCreate, DependencyResponse, ProjectTimelineResponse
)


class MilestoneService:
    """Service for milestone and timeline management."""

    def __init__(self, db: Session):
        self.db = db

    def create_milestone(self, milestone_data: MilestoneCreate) -> MilestoneResponse:
        """Create a new project milestone."""
        # Verify project exists
        project = self.db.query(Project).filter(Project.id == milestone_data.project_id).first()
        if not project:
            raise ValueError(f"Project with id {milestone_data.project_id} not found")

        # Create milestone
        milestone = ProjectMilestone(
            name=milestone_data.name,
            description=milestone_data.description,
            project_id=milestone_data.project_id,
            due_date=milestone_data.due_date,
            estimated_hours=milestone_data.estimated_hours,
            priority=milestone_data.priority,
            deliverables=milestone_data.deliverables,
            acceptance_criteria=milestone_data.acceptance_criteria,
            notes=milestone_data.notes
        )

        self.db.add(milestone)
        self.db.flush()  # Get the ID without committing

        # Add assignees if provided
        if milestone_data.assignee_ids:
            self._assign_users_to_milestone(milestone.id, milestone_data.assignee_ids)

        self.db.commit()
        self.db.refresh(milestone)

        return self._milestone_to_response(milestone)

    def update_milestone(self, milestone_id: int, milestone_data: MilestoneUpdate) -> Optional[MilestoneResponse]:
        """Update an existing milestone."""
        milestone = self.db.query(ProjectMilestone).filter(
            ProjectMilestone.id == milestone_id
        ).first()
        
        if not milestone:
            return None

        # Update fields
        update_data = milestone_data.dict(exclude_unset=True)
        assignee_ids = update_data.pop('assignee_ids', None)

        for field, value in update_data.items():
            if hasattr(milestone, field):
                setattr(milestone, field, value)

        # Handle status changes
        if milestone_data.status == MilestoneStatus.COMPLETED and milestone.status != MilestoneStatus.COMPLETED:
            milestone.completion_date = date.today()
            milestone.progress_percentage = 100

        # Update assignees if provided
        if assignee_ids is not None:
            self._update_milestone_assignees(milestone_id, assignee_ids)

        self.db.commit()
        self.db.refresh(milestone)

        return self._milestone_to_response(milestone)

    def get_milestone(self, milestone_id: int) -> Optional[MilestoneResponse]:
        """Get a milestone by ID."""
        milestone = self.db.query(ProjectMilestone).filter(
            ProjectMilestone.id == milestone_id
        ).options(
            joinedload(ProjectMilestone.assignees)
        ).first()

        if not milestone:
            return None

        return self._milestone_to_response(milestone)

    def get_project_milestones(self, project_id: int) -> List[MilestoneResponse]:
        """Get all milestones for a project."""
        milestones = self.db.query(ProjectMilestone).filter(
            ProjectMilestone.project_id == project_id
        ).options(
            joinedload(ProjectMilestone.assignees)
        ).order_by(ProjectMilestone.due_date).all()

        return [self._milestone_to_response(milestone) for milestone in milestones]

    def delete_milestone(self, milestone_id: int) -> bool:
        """Delete a milestone and its dependencies."""
        milestone = self.db.query(ProjectMilestone).filter(
            ProjectMilestone.id == milestone_id
        ).first()

        if not milestone:
            return False

        # Check for dependencies
        dependencies = self.db.query(MilestoneDependency).filter(
            or_(
                MilestoneDependency.predecessor_id == milestone_id,
                MilestoneDependency.successor_id == milestone_id
            )
        ).all()

        if dependencies:
            raise ValueError("Cannot delete milestone with existing dependencies")

        self.db.delete(milestone)
        self.db.commit()
        return True

    def create_dependency(self, dependency_data: DependencyCreate) -> DependencyResponse:
        """Create a dependency between milestones."""
        # Verify milestones exist and are in same project
        predecessor = self.db.query(ProjectMilestone).filter(
            ProjectMilestone.id == dependency_data.predecessor_id
        ).first()
        successor = self.db.query(ProjectMilestone).filter(
            ProjectMilestone.id == dependency_data.successor_id
        ).first()

        if not predecessor or not successor:
            raise ValueError("One or both milestones not found")

        if predecessor.project_id != successor.project_id:
            raise ValueError("Dependencies can only be created between milestones in the same project")

        # Check for circular dependencies
        if self._would_create_cycle(dependency_data.predecessor_id, dependency_data.successor_id):
            raise ValueError("Creating this dependency would create a circular dependency")

        dependency = MilestoneDependency(
            predecessor_id=dependency_data.predecessor_id,
            successor_id=dependency_data.successor_id,
            dependency_type=dependency_data.dependency_type,
            lag_days=dependency_data.lag_days,
            description=dependency_data.description
        )

        try:
            self.db.add(dependency)
            self.db.commit()
            self.db.refresh(dependency)
        except IntegrityError:
            self.db.rollback()
            raise ValueError("Dependency already exists between these milestones")

        return self._dependency_to_response(dependency)

    def get_project_dependencies(self, project_id: int) -> List[DependencyResponse]:
        """Get all dependencies for a project."""
        dependencies = self.db.query(MilestoneDependency).join(
            ProjectMilestone, MilestoneDependency.predecessor_id == ProjectMilestone.id
        ).filter(ProjectMilestone.project_id == project_id).all()

        return [self._dependency_to_response(dep) for dep in dependencies]

    def delete_dependency(self, dependency_id: int) -> bool:
        """Delete a milestone dependency."""
        dependency = self.db.query(MilestoneDependency).filter(
            MilestoneDependency.id == dependency_id
        ).first()

        if not dependency:
            return False

        self.db.delete(dependency)
        self.db.commit()
        return True

    def get_project_timeline(self, project_id: int) -> Optional[ProjectTimelineResponse]:
        """Get complete project timeline with milestones and dependencies."""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None

        milestones = self.get_project_milestones(project_id)
        dependencies = self.get_project_dependencies(project_id)
        critical_path = self._calculate_critical_path(project_id)

        # Calculate duration and completion
        duration_days = (project.end_date - project.start_date).days
        total_milestones = len(milestones)
        completed_milestones = len([m for m in milestones if m.status == MilestoneStatus.COMPLETED])
        completion_percentage = (
            (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
        )

        return ProjectTimelineResponse(
            project_id=project.id,
            project_name=project.name,
            start_date=project.start_date,
            end_date=project.end_date,
            duration_days=duration_days,
            milestones=milestones,
            dependencies=dependencies,
            critical_path=critical_path,
            completion_percentage=round(completion_percentage, 2)
        )

    def get_overdue_milestones(self, project_id: Optional[int] = None) -> List[MilestoneResponse]:
        """Get overdue milestones for a project or all projects."""
        query = self.db.query(ProjectMilestone).filter(
            and_(
                ProjectMilestone.due_date < date.today(),
                ProjectMilestone.status != MilestoneStatus.COMPLETED
            )
        )

        if project_id:
            query = query.filter(ProjectMilestone.project_id == project_id)

        milestones = query.options(joinedload(ProjectMilestone.assignees)).all()
        return [self._milestone_to_response(milestone) for milestone in milestones]

    def get_upcoming_milestones(self, days_ahead: int = 7, project_id: Optional[int] = None) -> List[MilestoneResponse]:
        """Get upcoming milestones within specified days."""
        from datetime import timedelta
        
        end_date = date.today() + timedelta(days=days_ahead)
        
        query = self.db.query(ProjectMilestone).filter(
            and_(
                ProjectMilestone.due_date.between(date.today(), end_date),
                ProjectMilestone.status != MilestoneStatus.COMPLETED
            )
        )

        if project_id:
            query = query.filter(ProjectMilestone.project_id == project_id)

        milestones = query.options(joinedload(ProjectMilestone.assignees)).order_by(
            ProjectMilestone.due_date
        ).all()

        return [self._milestone_to_response(milestone) for milestone in milestones]

    def update_milestone_progress(self, milestone_id: int, progress_percentage: int) -> Optional[MilestoneResponse]:
        """Update milestone progress percentage."""
        milestone = self.db.query(ProjectMilestone).filter(
            ProjectMilestone.id == milestone_id
        ).first()

        if not milestone:
            return None

        milestone.progress_percentage = max(0, min(100, progress_percentage))
        
        # Auto-update status based on progress
        if milestone.progress_percentage == 100 and milestone.status != MilestoneStatus.COMPLETED:
            milestone.status = MilestoneStatus.COMPLETED
            milestone.completion_date = date.today()
        elif milestone.progress_percentage > 0 and milestone.status == MilestoneStatus.PENDING:
            milestone.status = MilestoneStatus.IN_PROGRESS

        self.db.commit()
        self.db.refresh(milestone)

        return self._milestone_to_response(milestone)

    def _assign_users_to_milestone(self, milestone_id: int, user_ids: List[int]) -> None:
        """Assign users to a milestone."""
        for user_id in user_ids:
            assignee = MilestoneAssignee(
                milestone_id=milestone_id,
                user_id=user_id,
                assigned_date=date.today()
            )
            self.db.add(assignee)

    def _update_milestone_assignees(self, milestone_id: int, user_ids: List[int]) -> None:
        """Update milestone assignees."""
        # Remove existing assignees
        self.db.query(MilestoneAssignee).filter(
            MilestoneAssignee.milestone_id == milestone_id
        ).delete()

        # Add new assignees
        self._assign_users_to_milestone(milestone_id, user_ids)

    def _milestone_to_response(self, milestone: ProjectMilestone) -> MilestoneResponse:
        """Convert milestone model to response schema."""
        assignees = []
        if hasattr(milestone, 'assignees') and milestone.assignees:
            for assignee in milestone.assignees:
                if hasattr(assignee, 'user'):
                    assignees.append({
                        "user_id": assignee.user_id,
                        "full_name": assignee.user.full_name,
                        "email": assignee.user.email,
                        "role": assignee.role,
                        "assigned_date": assignee.assigned_date
                    })

        return MilestoneResponse(
            id=milestone.id,
            name=milestone.name,
            description=milestone.description,
            project_id=milestone.project_id,
            due_date=milestone.due_date,
            completion_date=milestone.completion_date,
            estimated_hours=milestone.estimated_hours,
            actual_hours=milestone.actual_hours,
            status=milestone.status,
            progress_percentage=milestone.progress_percentage,
            priority=milestone.priority,
            is_critical_path=bool(milestone.is_critical_path),
            deliverables=milestone.deliverables,
            acceptance_criteria=milestone.acceptance_criteria,
            notes=milestone.notes,
            assignees=assignees,
            created_at=milestone.created_at,
            updated_at=milestone.updated_at
        )

    def _dependency_to_response(self, dependency: MilestoneDependency) -> DependencyResponse:
        """Convert dependency model to response schema."""
        return DependencyResponse(
            id=dependency.id,
            predecessor_id=dependency.predecessor_id,
            successor_id=dependency.successor_id,
            predecessor_name=dependency.predecessor.name,
            successor_name=dependency.successor.name,
            dependency_type=dependency.dependency_type,
            lag_days=dependency.lag_days,
            description=dependency.description,
            is_external=bool(dependency.is_external),
            created_at=dependency.created_at
        )

    def _would_create_cycle(self, predecessor_id: int, successor_id: int) -> bool:
        """Check if creating a dependency would create a circular dependency."""
        # Use depth-first search to detect cycles
        visited = set()
        
        def has_path(start: int, end: int) -> bool:
            if start == end:
                return True
            if start in visited:
                return False
            
            visited.add(start)
            
            # Get all successors of the current milestone
            successors = self.db.query(MilestoneDependency.successor_id).filter(
                MilestoneDependency.predecessor_id == start
            ).all()
            
            for (successor,) in successors:
                if has_path(successor, end):
                    return True
            
            return False
        
        # Check if there's already a path from successor to predecessor
        return has_path(successor_id, predecessor_id)

    def _calculate_critical_path(self, project_id: int) -> List[int]:
        """Calculate the critical path for a project (simplified implementation)."""
        # This is a simplified version of critical path calculation
        # In a full implementation, you'd use proper critical path method (CPM)
        
        milestones = self.db.query(ProjectMilestone).filter(
            ProjectMilestone.project_id == project_id
        ).all()

        dependencies = self.db.query(MilestoneDependency).join(
            ProjectMilestone, MilestoneDependency.predecessor_id == ProjectMilestone.id
        ).filter(ProjectMilestone.project_id == project_id).all()

        # For now, return milestones that have no slack time (simplified)
        # This would need proper forward/backward pass calculation in production
        critical_milestones = []
        
        for milestone in milestones:
            # Mark as critical if it's overdue or has high priority
            if milestone.is_overdue() or milestone.priority >= 8:
                critical_milestones.append(milestone.id)

        return critical_milestones

    def create_project_from_template(
        self, 
        template_id: int, 
        project_data: dict, 
        created_by: int
    ) -> Project:
        """Create a new project based on a template."""
        from app.models.milestone import ProjectTemplate, TemplateMilestone, TemplateRole
        
        template = self.db.query(ProjectTemplate).filter(
            ProjectTemplate.id == template_id
        ).first()
        
        if not template:
            raise ValueError("Template not found")
        
        # Create the project
        project = Project(
            name=project_data['name'],
            description=project_data.get('description', template.description),
            client_id=project_data['client_id'],
            start_date=project_data.get('start_date', date.today()),
            end_date=project_data.get('end_date'),
            status='planning',
            created_by=created_by
        )
        
        self.db.add(project)
        self.db.flush()  # Get the project ID
        
        # Create milestones from template
        milestone_map = {}  # Map template milestone names to created milestone IDs
        
        for template_milestone in template.milestones:
            milestone_date = project.start_date + timedelta(days=template_milestone.duration_offset)
            
            milestone = ProjectMilestone(
                project_id=project.id,
                name=template_milestone.name,
                description=template_milestone.description,
                due_date=milestone_date,
                status='pending',
                priority=5,  # Default priority
                progress=0.0
            )
            
            self.db.add(milestone)
            self.db.flush()  # Get milestone ID
            milestone_map[template_milestone.name] = milestone.id
        
        # Create dependencies between milestones
        for template_milestone in template.milestones:
            if template_milestone.dependencies:
                current_milestone_id = milestone_map[template_milestone.name]
                
                for dep_name in template_milestone.dependencies:
                    if dep_name in milestone_map:
                        dependency = MilestoneDependency(
                            predecessor_id=milestone_map[dep_name],
                            successor_id=current_milestone_id,
                            dependency_type='finish_to_start',
                            lag_days=0
                        )
                        self.db.add(dependency)
        
        # Create role assignments (simplified - would need team member assignment logic)
        # This would typically involve finding available team members with matching roles
        
        self.db.commit()
        return project

    def preview_template(self, template_id: int) -> dict:
        """Generate a preview of what a project would look like from a template."""
        from app.models.milestone import ProjectTemplate
        
        template = self.db.query(ProjectTemplate).filter(
            ProjectTemplate.id == template_id
        ).first()
        
        if not template:
            raise ValueError("Template not found")
        
        # Calculate timeline
        start_date = date.today()
        milestones_preview = []
        
        for template_milestone in template.milestones:
            milestone_date = start_date + timedelta(days=template_milestone.duration_offset)
            milestones_preview.append({
                'name': template_milestone.name,
                'description': template_milestone.description,
                'due_date': milestone_date.isoformat(),
                'duration_offset': template_milestone.duration_offset,
                'dependencies': template_milestone.dependencies
            })
        
        # Calculate end date
        max_offset = max(
            (m.duration_offset for m in template.milestones), 
            default=template.estimated_duration
        )
        end_date = start_date + timedelta(days=max_offset)
        
        return {
            'template_name': template.name,
            'estimated_duration': template.estimated_duration,
            'complexity': template.complexity,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'milestones': milestones_preview,
            'roles_required': [
                {
                    'role_name': role.role_name,
                    'fte_allocation': role.fte_allocation,
                    'start_offset': role.start_offset,
                    'duration': role.duration
                }
                for role in template.roles
            ]
        }