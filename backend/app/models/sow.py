"""
Statement of Work (SOW) models for contract and role management.

This module defines the SOW, SOWRole, and SOWHistory models
for managing contracts, role definitions, and FTE allocations.
"""

import enum
from typing import List, Optional
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Enum, Text, Date, DateTime, JSON, DECIMAL, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class SOWStatus(enum.Enum):
    """SOW status enumeration."""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SOWRoleName(enum.Enum):
    """SOW role name enumeration."""
    BACKEND_DEVELOPER = "Backend Developer"
    FRONTEND_DEVELOPER = "Frontend Developer"
    DESIGNER = "Designer"
    TESTER = "Tester"
    BUSINESS_ANALYST = "Business Analyst"
    ARCHITECT = "Architect"
    PROJECT_MANAGER = "Project Manager"


class SOW(BaseModel):
    """
    Statement of Work model for contract management.
    
    Represents contracts or agreements that define project scope,
    roles, and resource allocations.
    """
    
    __tablename__ = "sows"
    
    # Basic SOW information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        Enum(SOWStatus), 
        nullable=False, 
        default=SOWStatus.DRAFT,
        index=True
    )
    
    # Foreign keys
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Date range
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    
    # FTE tracking
    total_fte = Column(DECIMAL(4, 2), nullable=False, default=0.00)
    
    # Relationships
    client = relationship("Client", back_populates="sows")
    created_by_user = relationship(
        "User", 
        back_populates="created_sows",
        foreign_keys=[created_by]
    )
    
    roles = relationship(
        "SOWRole", 
        back_populates="sow",
        cascade="all, delete-orphan"
    )
    
    projects = relationship("Project", back_populates="sow")
    groups = relationship("Group", back_populates="sow")
    
    history = relationship(
        "SOWHistory", 
        back_populates="sow",
        cascade="all, delete-orphan"
    )
    
    # Database constraints
    __table_args__ = (
        Index('idx_sows_client_id', 'client_id'),
        Index('idx_sows_status', 'status'),
        Index('idx_sows_dates', 'start_date', 'end_date'),
        CheckConstraint('start_date <= end_date OR start_date IS NULL OR end_date IS NULL', 
                       name='chk_sow_date_order'),
        CheckConstraint('total_fte >= 0', name='chk_sow_total_fte_positive')
    )
    
    def __repr__(self) -> str:
        """String representation of the SOW."""
        return f"<SOW(id={self.id}, name='{self.name}', status='{self.status.value}')>"
    
    def is_active(self) -> bool:
        """Check if SOW is active."""
        return self.status == SOWStatus.ACTIVE
    
    def is_current(self) -> bool:
        """Check if SOW is within its date range."""
        from datetime import date
        if not self.start_date or not self.end_date:
            return True  # Open-ended SOW
        today = date.today()
        return self.start_date <= today <= self.end_date
    
    def calculate_total_fte(self) -> Decimal:
        """Calculate total FTE from all roles."""
        total = sum(role.fte_allocation for role in self.roles)
        return Decimal(str(round(float(total), 2)))
    
    def update_total_fte(self) -> None:
        """Update the total_fte field based on role allocations."""
        self.total_fte = self.calculate_total_fte()
    
    def activate(self) -> None:
        """Activate the SOW."""
        self.status = SOWStatus.ACTIVE
    
    def complete(self) -> None:
        """Mark SOW as completed."""
        self.status = SOWStatus.COMPLETED
    
    def cancel(self) -> None:
        """Cancel the SOW."""
        self.status = SOWStatus.CANCELLED


class SOWRole(BaseModel):
    """
    SOW role model for defining role requirements and allocations.
    
    Represents specific role requirements within a SOW with
    FTE allocations and hourly rates.
    """
    
    __tablename__ = "sow_roles"
    
    # Foreign key
    sow_id = Column(Integer, ForeignKey("sows.id"), nullable=False, index=True)
    
    # Role definition
    role_name = Column(Enum(SOWRoleName), nullable=False)
    fte_allocation = Column(DECIMAL(4, 2), nullable=False)
    hourly_rate = Column(DECIMAL(8, 2), nullable=True)
    description = Column(Text, nullable=True)
    
    # Relationships
    sow = relationship("SOW", back_populates="roles")
    
    # Database constraints
    __table_args__ = (
        Index('idx_sow_roles_sow_id', 'sow_id'),
        Index('uk_sow_roles_sow_role', 'sow_id', 'role_name', unique=True),
        CheckConstraint('fte_allocation > 0', name='chk_sow_role_fte_positive'),
        CheckConstraint('hourly_rate IS NULL OR hourly_rate > 0', 
                       name='chk_sow_role_rate_positive')
    )
    
    def __repr__(self) -> str:
        """String representation of the SOWRole."""
        return f"<SOWRole(id={self.id}, role='{self.role_name.value}', fte={self.fte_allocation})>"
    
    def get_monthly_cost(self, hours_per_month: int = 160) -> Optional[Decimal]:
        """Calculate monthly cost based on FTE and hourly rate."""
        if not self.hourly_rate:
            return None
        monthly_hours = Decimal(str(hours_per_month)) * self.fte_allocation
        return monthly_hours * self.hourly_rate


class SOWHistory(BaseModel):
    """
    SOW history model for versioned change tracking.
    
    Maintains versioned history of SOW changes with role snapshots
    for contract compliance and auditing.
    """
    
    __tablename__ = "sow_history"
    
    # Foreign keys
    sow_id = Column(Integer, ForeignKey("sows.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Version tracking
    version_number = Column(Integer, nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    changes_description = Column(Text, nullable=True)
    roles_snapshot = Column(JSON, nullable=True)  # Snapshot of roles at this version
    
    # Relationships
    sow = relationship("SOW", back_populates="history")
    created_by_user = relationship("User")
    
    # Database constraints
    __table_args__ = (
        Index('idx_sow_history_sow_id', 'sow_id'),
        Index('idx_sow_history_version', 'version_number'),
        Index('uk_sow_history_sow_version', 'sow_id', 'version_number', unique=True),
        CheckConstraint('start_date <= end_date', name='chk_sow_history_date_order'),
        CheckConstraint('version_number > 0', name='chk_sow_history_version_positive')
    )
    
    def __repr__(self) -> str:
        """String representation of the SOWHistory."""
        return f"<SOWHistory(id={self.id}, sow_id={self.sow_id}, version={self.version_number})>"