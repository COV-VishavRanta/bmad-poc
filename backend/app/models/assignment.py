"""
Assignment models for team member allocation and tracking.

This module defines the Assignment and AssignmentHistory models
for managing team member assignments to projects with FTE tracking.
"""

import enum
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import Column, Integer, String, Enum, Text, Date, DateTime, JSON, DECIMAL, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class AssignmentStatus(enum.Enum):
    """Assignment status enumeration."""
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AssignmentHistoryAction(enum.Enum):
    """Assignment history action enumeration."""
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    STATUS_CHANGED = "status_changed"


class Assignment(BaseModel):
    """
    Assignment model for team member project allocations.
    
    Represents the assignment of team members to projects with
    role definitions, FTE allocations, and timeline tracking.
    """
    
    __tablename__ = "assignments"
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Assignment details
    role_name = Column(String(100), nullable=False)
    fte_allocation = Column(DECIMAL(4, 2), nullable=False)
    status = Column(
        Enum(AssignmentStatus), 
        nullable=False, 
        default=AssignmentStatus.PLANNED,
        index=True
    )
    
    # Timeline
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Additional information
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship(
        "User", 
        back_populates="assignments",
        foreign_keys=[user_id]
    )
    
    project = relationship("Project", back_populates="assignments")
    
    created_by_user = relationship(
        "User",
        back_populates="created_assignments", 
        foreign_keys=[created_by]
    )
    
    history = relationship(
        "AssignmentHistory", 
        back_populates="assignment",
        cascade="all, delete-orphan"
    )
    
    # Database constraints
    __table_args__ = (
        Index('idx_assignments_user_id', 'user_id'),
        Index('idx_assignments_project_id', 'project_id'),
        Index('idx_assignments_dates', 'start_date', 'end_date'),
        Index('idx_assignments_status', 'status'),
        CheckConstraint('fte_allocation BETWEEN 0.1 AND 1.0', name='chk_fte_range'),
        CheckConstraint('start_date <= end_date', name='chk_date_order')
    )
    
    def __repr__(self) -> str:
        """String representation of the Assignment."""
        return f"<Assignment(id={self.id}, user_id={self.user_id}, project_id={self.project_id}, fte={self.fte_allocation})>"
    
    def is_active(self) -> bool:
        """Check if assignment is currently active."""
        return self.status == AssignmentStatus.ACTIVE
    
    def is_current(self) -> bool:
        """Check if assignment is within its date range."""
        today = date.today()
        return self.start_date <= today <= self.end_date
    
    def get_duration_days(self) -> int:
        """Calculate assignment duration in days."""
        return (self.end_date - self.start_date).days + 1
    
    def get_duration_weeks(self) -> float:
        """Calculate assignment duration in weeks."""
        return self.get_duration_days() / 7.0
    
    def overlaps_with(self, other: 'Assignment') -> bool:
        """Check if this assignment overlaps with another assignment."""
        return not (self.end_date < other.start_date or self.start_date > other.end_date)
    
    def calculate_total_hours(self, hours_per_week: int = 40) -> Decimal:
        """Calculate total hours for this assignment."""
        weeks = Decimal(str(self.get_duration_weeks()))
        weekly_hours = Decimal(str(hours_per_week)) * self.fte_allocation
        return weeks * weekly_hours
    
    def activate(self) -> None:
        """Activate the assignment."""
        self.status = AssignmentStatus.ACTIVE
    
    def complete(self) -> None:
        """Mark assignment as completed."""
        self.status = AssignmentStatus.COMPLETED
    
    def cancel(self) -> None:
        """Cancel the assignment."""
        self.status = AssignmentStatus.CANCELLED
    
    @classmethod
    def get_user_fte_total(cls, db_session, user_id: int, start_date: date, end_date: date) -> Decimal:
        """
        Calculate total FTE for a user within a date range.
        
        Args:
            db_session: Database session
            user_id: User ID to check
            start_date: Start date for the range
            end_date: End date for the range
            
        Returns:
            Total FTE allocation for the user in the date range
        """
        overlapping_assignments = db_session.query(cls).filter(
            cls.user_id == user_id,
            cls.status.in_([AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE]),
            cls.start_date <= end_date,
            cls.end_date >= start_date
        ).all()
        
        total_fte = sum(assignment.fte_allocation for assignment in overlapping_assignments)
        return Decimal(str(round(float(total_fte), 2)))
    
    def validate_fte_constraint(self, db_session) -> bool:
        """
        Validate that this assignment doesn't cause user to exceed 1.0 FTE.
        
        Args:
            db_session: Database session
            
        Returns:
            True if FTE constraint is satisfied, False otherwise
        """
        total_fte = self.get_user_fte_total(
            db_session, 
            self.user_id, 
            self.start_date, 
            self.end_date
        )
        
        # Subtract this assignment's FTE if it's already in the database
        if self.id:
            total_fte -= self.fte_allocation
            
        # Add the new FTE allocation
        total_fte += self.fte_allocation
        
        return total_fte <= Decimal('1.0')


class AssignmentHistory(BaseModel):
    """
    Assignment history model for audit trail.
    
    Tracks all changes made to assignment records for compliance and auditing.
    """
    
    __tablename__ = "assignment_history"
    
    # Foreign keys
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False, index=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Change tracking
    action = Column(Enum(AssignmentHistoryAction), nullable=False, index=True)
    changed_fields = Column(JSON, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    changed_at = Column(
        DateTime, 
        nullable=False, 
        default=BaseModel.created_at.default,
        index=True
    )
    
    # Relationships
    assignment = relationship("Assignment", back_populates="history")
    changed_by_user = relationship("User")
    
    # Database indexes
    __table_args__ = (
        Index('idx_assignment_history_assignment_id', 'assignment_id'),
        Index('idx_assignment_history_action', 'action'),
        Index('idx_assignment_history_changed_at', 'changed_at'),
    )
    
    def __repr__(self) -> str:
        """String representation of the AssignmentHistory."""
        return f"<AssignmentHistory(id={self.id}, assignment_id={self.assignment_id}, action='{self.action.value}')>"