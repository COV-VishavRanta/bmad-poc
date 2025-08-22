"""
Project analytics service for advanced reporting and metrics.

This module provides services for project analytics, resource allocation
visualization, and performance reporting functionality.
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy import func, and_, or_, desc
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Project, ProjectMilestone, ProjectMetric, Assignment,
    User, Group, MilestoneStatus, ProjectStatus
)
from app.schemas.milestone import (
    ProjectAnalyticsResponse, ResourceAllocationResponse,
    MetricType, ProjectMetricCreate, ProjectMetricResponse
)


class ProjectAnalyticsService:
    """Service for project analytics and reporting."""

    def __init__(self, db: Session):
        self.db = db

    def get_project_analytics(self, project_id: int) -> Optional[ProjectAnalyticsResponse]:
        """Get comprehensive analytics for a specific project."""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None

        # Get milestone statistics
        milestones = self.db.query(ProjectMilestone).filter(
            ProjectMilestone.project_id == project_id
        ).all()

        total_milestones = len(milestones)
        completed_milestones = len([m for m in milestones if m.status == MilestoneStatus.COMPLETED])
        overdue_milestones = len([m for m in milestones if m.is_overdue()])

        # Calculate completion percentage
        completion_percentage = (
            (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
        )

        # Calculate total hours
        total_estimated_hours = sum(
            m.estimated_hours or 0 for m in milestones
        )
        total_actual_hours = sum(
            m.actual_hours or 0 for m in milestones if m.actual_hours
        )

        # Calculate efficiency ratio
        efficiency_ratio = None
        if total_actual_hours > 0 and total_estimated_hours > 0:
            efficiency_ratio = total_estimated_hours / total_actual_hours

        # Calculate days remaining
        today = date.today()
        days_remaining = (project.end_date - today).days if project.end_date >= today else 0

        # Determine if project is on track
        expected_completion = (
            (today - project.start_date).days / (project.end_date - project.start_date).days * 100
            if project.end_date > project.start_date else 0
        )
        is_on_track = completion_percentage >= expected_completion - 10  # 10% tolerance

        # Determine risk level
        risk_level = self._calculate_risk_level(
            completion_percentage, expected_completion, overdue_milestones, days_remaining
        )

        # Get latest metrics
        latest_metrics = self.db.query(ProjectMetric).filter(
            ProjectMetric.project_id == project_id
        ).order_by(desc(ProjectMetric.measurement_date)).limit(10).all()

        return ProjectAnalyticsResponse(
            project_id=project.id,
            project_name=project.name,
            total_milestones=total_milestones,
            completed_milestones=completed_milestones,
            overdue_milestones=overdue_milestones,
            completion_percentage=round(completion_percentage, 2),
            total_estimated_hours=total_estimated_hours,
            total_actual_hours=total_actual_hours,
            efficiency_ratio=round(efficiency_ratio, 2) if efficiency_ratio else None,
            days_remaining=days_remaining,
            is_on_track=is_on_track,
            risk_level=risk_level,
            latest_metrics=[
                ProjectMetricResponse.from_orm(metric) for metric in latest_metrics
            ]
        )

    def get_resource_allocation(self, project_id: int) -> Optional[ResourceAllocationResponse]:
        """Get resource allocation analytics for a project."""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None

        # Get active assignments
        assignments = self.db.query(Assignment).filter(
            and_(
                Assignment.project_id == project_id,
                Assignment.status == "active"
            )
        ).options(joinedload(Assignment.user)).all()

        total_fte_allocated = sum(assignment.fte_allocation for assignment in assignments)

        # Build team members data
        team_members = []
        allocation_by_role = {}

        for assignment in assignments:
            member_data = {
                "user_id": assignment.user_id,
                "full_name": assignment.user.full_name,
                "email": assignment.user.email,
                "role": assignment.role,
                "fte_allocation": assignment.fte_allocation,
                "start_date": assignment.start_date.isoformat() if assignment.start_date else None,
                "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
            }
            team_members.append(member_data)

            # Aggregate by role
            role = assignment.role or "Unspecified"
            allocation_by_role[role] = allocation_by_role.get(role, 0) + assignment.fte_allocation

        # Calculate utilization percentage (assuming 100% is ideal)
        utilization_percentage = min(total_fte_allocated * 100, 100)

        # Detect resource conflicts (users over-allocated across projects)
        conflicts = self._detect_resource_conflicts(assignments)

        return ResourceAllocationResponse(
            project_id=project.id,
            project_name=project.name,
            total_fte_allocated=round(total_fte_allocated, 2),
            team_members=team_members,
            allocation_by_role={k: round(v, 2) for k, v in allocation_by_role.items()},
            utilization_percentage=round(utilization_percentage, 2),
            conflicts=conflicts
        )

    def create_metric(self, metric_data: ProjectMetricCreate) -> ProjectMetricResponse:
        """Create a new project metric."""
        metric = ProjectMetric(
            project_id=metric_data.project_id,
            metric_type=metric_data.metric_type.value,
            metric_value=metric_data.metric_value,
            metric_unit=metric_data.metric_unit,
            measurement_date=metric_data.measurement_date,
            measurement_period=metric_data.measurement_period,
            category=metric_data.category,
            subcategory=metric_data.subcategory,
            notes=metric_data.notes
        )

        self.db.add(metric)
        self.db.commit()
        self.db.refresh(metric)

        return ProjectMetricResponse.from_orm(metric)

    def get_portfolio_analytics(self, client_id: Optional[int] = None) -> Dict[str, Any]:
        """Get portfolio-level analytics across multiple projects."""
        query = self.db.query(Project)
        
        if client_id:
            query = query.filter(Project.client_id == client_id)

        projects = query.all()

        total_projects = len(projects)
        active_projects = len([p for p in projects if p.status == ProjectStatus.ACTIVE])
        completed_projects = len([p for p in projects if p.status == ProjectStatus.COMPLETED])
        
        # Calculate total resource allocation
        total_fte = self.db.query(func.sum(Assignment.fte_allocation)).filter(
            Assignment.project_id.in_([p.id for p in projects]),
            Assignment.status == "active"
        ).scalar() or 0

        # Get milestone statistics across all projects
        project_ids = [p.id for p in projects]
        milestone_stats = self.db.query(
            func.count(ProjectMilestone.id).label('total'),
            func.sum(func.case([(ProjectMilestone.status == MilestoneStatus.COMPLETED, 1)], else_=0)).label('completed')
        ).filter(ProjectMilestone.project_id.in_(project_ids)).first()

        portfolio_completion = (
            (milestone_stats.completed / milestone_stats.total * 100) 
            if milestone_stats.total > 0 else 0
        )

        return {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "completed_projects": completed_projects,
            "portfolio_completion_percentage": round(portfolio_completion, 2),
            "total_fte_allocated": round(total_fte, 2),
            "projects_by_status": self._get_projects_by_status(projects),
            "resource_utilization_trend": self._get_resource_trend(project_ids),
            "milestone_completion_trend": self._get_milestone_trend(project_ids)
        }

    def get_team_workload_analysis(self, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """Analyze team workload across date range."""
        assignments = self.db.query(Assignment).filter(
            and_(
                Assignment.status == "active",
                or_(
                    Assignment.end_date.is_(None),
                    Assignment.end_date >= start_date
                ),
                Assignment.start_date <= end_date
            )
        ).options(joinedload(Assignment.user), joinedload(Assignment.project)).all()

        # Group by user
        user_workloads = {}
        for assignment in assignments:
            user_id = assignment.user_id
            if user_id not in user_workloads:
                user_workloads[user_id] = {
                    "user_id": user_id,
                    "full_name": assignment.user.full_name,
                    "email": assignment.user.email,
                    "total_fte": 0,
                    "project_count": 0,
                    "projects": [],
                    "is_overallocated": False
                }

            user_workloads[user_id]["total_fte"] += assignment.fte_allocation
            user_workloads[user_id]["project_count"] += 1
            user_workloads[user_id]["projects"].append({
                "project_id": assignment.project_id,
                "project_name": assignment.project.name,
                "role": assignment.role,
                "fte_allocation": assignment.fte_allocation,
                "start_date": assignment.start_date.isoformat() if assignment.start_date else None,
                "end_date": assignment.end_date.isoformat() if assignment.end_date else None
            })

        # Mark overallocated users
        for user_data in user_workloads.values():
            user_data["total_fte"] = round(user_data["total_fte"], 2)
            user_data["is_overallocated"] = user_data["total_fte"] > 1.0

        return list(user_workloads.values())

    def _calculate_risk_level(
        self, 
        completion_percentage: float, 
        expected_completion: float, 
        overdue_count: int, 
        days_remaining: int
    ) -> str:
        """Calculate project risk level based on various factors."""
        risk_score = 0

        # Completion vs expected
        if completion_percentage < expected_completion - 20:
            risk_score += 3
        elif completion_percentage < expected_completion - 10:
            risk_score += 2
        elif completion_percentage < expected_completion:
            risk_score += 1

        # Overdue milestones
        if overdue_count > 3:
            risk_score += 3
        elif overdue_count > 1:
            risk_score += 2
        elif overdue_count > 0:
            risk_score += 1

        # Time remaining
        if days_remaining < 7:
            risk_score += 2
        elif days_remaining < 30:
            risk_score += 1

        # Determine risk level
        if risk_score >= 6:
            return "high"
        elif risk_score >= 3:
            return "medium"
        else:
            return "low"

    def _detect_resource_conflicts(self, assignments: List[Assignment]) -> List[Dict[str, Any]]:
        """Detect resource allocation conflicts."""
        conflicts = []
        
        # Group assignments by user and check for overlaps
        user_assignments = {}
        for assignment in assignments:
            user_id = assignment.user_id
            if user_id not in user_assignments:
                user_assignments[user_id] = []
            user_assignments[user_id].append(assignment)

        for user_id, user_assignments_list in user_assignments.items():
            if len(user_assignments_list) > 1:
                # Check for overlapping date ranges with total FTE > 1.0
                total_fte = sum(a.fte_allocation for a in user_assignments_list)
                if total_fte > 1.0:
                    conflicts.append({
                        "user_id": user_id,
                        "user_name": user_assignments_list[0].user.full_name,
                        "total_fte": round(total_fte, 2),
                        "conflict_projects": [
                            {
                                "project_id": a.project_id,
                                "project_name": a.project.name,
                                "fte_allocation": a.fte_allocation
                            }
                            for a in user_assignments_list
                        ]
                    })

        return conflicts

    def _get_projects_by_status(self, projects: List[Project]) -> Dict[str, int]:
        """Get project count by status."""
        status_counts = {}
        for project in projects:
            status = project.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        return status_counts

    def _get_resource_trend(self, project_ids: List[int]) -> List[Dict[str, Any]]:
        """Get resource utilization trend over time."""
        # This is a simplified version - in practice, you'd want to calculate
        # FTE allocation over time periods
        end_date = date.today()
        start_date = end_date - timedelta(days=90)
        
        assignments = self.db.query(Assignment).filter(
            and_(
                Assignment.project_id.in_(project_ids),
                Assignment.start_date <= end_date,
                or_(Assignment.end_date.is_(None), Assignment.end_date >= start_date)
            )
        ).all()

        # Group by month and calculate total FTE
        monthly_data = {}
        current_date = start_date
        while current_date <= end_date:
            month_key = current_date.strftime("%Y-%m")
            monthly_fte = sum(
                assignment.fte_allocation 
                for assignment in assignments
                if (assignment.start_date <= current_date and 
                    (assignment.end_date is None or assignment.end_date >= current_date))
            )
            monthly_data[month_key] = round(monthly_fte, 2)
            current_date = current_date.replace(day=1) + timedelta(days=32)
            current_date = current_date.replace(day=1)

        return [{"month": k, "total_fte": v} for k, v in monthly_data.items()]

    def _get_milestone_trend(self, project_ids: List[int]) -> List[Dict[str, Any]]:
        """Get milestone completion trend over time."""
        end_date = date.today()
        start_date = end_date - timedelta(days=90)

        completed_milestones = self.db.query(ProjectMilestone).filter(
            and_(
                ProjectMilestone.project_id.in_(project_ids),
                ProjectMilestone.status == MilestoneStatus.COMPLETED,
                ProjectMilestone.completion_date.between(start_date, end_date)
            )
        ).all()

        # Group by month
        monthly_completions = {}
        for milestone in completed_milestones:
            month_key = milestone.completion_date.strftime("%Y-%m")
            monthly_completions[month_key] = monthly_completions.get(month_key, 0) + 1

        return [{"month": k, "completed_milestones": v} for k, v in monthly_completions.items()]