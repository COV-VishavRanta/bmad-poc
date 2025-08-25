"""
Client management models.

This module defines the database models for client management,
including clients, client types, and audit history.
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ClientType(enum.Enum):
    """Enumeration of client types in the system."""
    CUSTOMER = "Customer"  # External paying customers - Primary revenue source
    PARTNER = "Partner"    # Strategic business partners - Collaboration projects
    INTERNAL = "Internal"  # Internal departments/teams - Internal projects


class ClientStatus(enum.Enum):
    """Enumeration of client status values."""
    ACTIVE = "Active"      # Client is active and can have projects
    INACTIVE = "Inactive"  # Client is inactive, no new projects


class HistoryAction(enum.Enum):
    """Enumeration of audit history actions."""
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    DEACTIVATE = "DEACTIVATE"


class Client(Base):
    """
    Client model for managing client organizations.
    
    Represents a client organization in the system with type classification,
    status tracking, and relationship management capabilities.
    """
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    client_type = Column(String(20), nullable=False)  # Customer, Partner, Internal
    status = Column(String(10), nullable=False, default=ClientStatus.ACTIVE.value)
    relation_type = Column(String(100), nullable=False)
    project_mgmt_tool = Column(String(100), nullable=True)
    comments = Column(Text, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
    history = relationship("ClientHistory", back_populates="client", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Client(id={self.id}, name='{self.name}', type='{self.client_type}', status='{self.status}')>"

    @property
    def is_active(self) -> bool:
        """Check if the client is active."""
        return self.status == ClientStatus.ACTIVE.value

    def can_be_deleted(self) -> bool:
        """
        Check if client can be deleted.
        
        Returns:
            True if client has no active projects, False otherwise
            
        Note:
            This will be expanded when Project model is implemented
        """
        # TODO: Check for active projects when Project model exists
        # For now, return True to allow deletion
        return True


class ClientHistory(Base):
    """
    Client audit history model for tracking all client changes.
    
    Maintains a complete audit trail of all client operations
    including who made changes and what was changed.
    """
    __tablename__ = "client_history"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    action = Column(String(20), nullable=False)  # CREATE, UPDATE, DELETE, DEACTIVATE
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    client = relationship("Client", back_populates="history")
    changed_by_user = relationship("User")

    def __repr__(self) -> str:
        return f"<ClientHistory(id={self.id}, client_id={self.client_id}, action='{self.action}', changed_at='{self.changed_at}')>"


def get_client_permissions(user_role: str) -> dict[str, bool]:
    """
    Get client management permissions for a specific user role.
    
    Args:
        user_role: The user role (HR, PC, RM)
        
    Returns:
        Dictionary of permission flags for client operations
    """
    permissions = {
        "HR": {
            "can_create": True,
            "can_read_all": True,
            "can_update_all": True,
            "can_delete": True,
            "can_view_audit": True
        },
        "PC": {
            "can_create": False,
            "can_read_all": True,
            "can_update_all": False,  # Can only update assigned clients
            "can_delete": False,
            "can_view_audit": False
        },
        "RM": {
            "can_create": False,
            "can_read_all": True,
            "can_update_all": False,
            "can_delete": False,
            "can_view_audit": False
        }
    }
    
    return permissions.get(user_role, {
        "can_create": False,
        "can_read_all": False,
        "can_update_all": False,
        "can_delete": False,
        "can_view_audit": False
    })