"""
Client models for customer and partner management.

This module defines the Client, ClientContact, and ClientHistory models
for managing client relationships and contact information.
"""

import enum
from typing import List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ClientStatus(enum.Enum):
    """Client status enumeration."""

    ACTIVE = "active"
    INACTIVE = "inactive"


class RelationType(enum.Enum):
    """Client relationship type enumeration."""

    CUSTOMER = "Customer"
    PARTNER = "Partner"
    INTERNAL = "Internal"


class ClientHistoryAction(enum.Enum):
    """Client history action enumeration."""

    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    ACTIVATED = "activated"
    DEACTIVATED = "deactivated"


class Client(BaseModel):
    """
    Client model for customer and partner organizations.

    Represents external organizations that the company works with,
    including customers, partners, and internal departments.
    """

    __tablename__ = "clients"

    # Basic client information
    name = Column(String(255), nullable=False)
    status = Column(
        Enum(ClientStatus), nullable=False, default=ClientStatus.ACTIVE, index=True
    )
    relation_type = Column(Enum(RelationType), nullable=False, index=True)

    # Additional information
    project_management_tool = Column(String(100), nullable=True)
    comments = Column(Text, nullable=True)

    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    created_by_user = relationship(
        "User", back_populates="created_clients", foreign_keys=[created_by]
    )

    contacts = relationship(
        "ClientContact", back_populates="client", cascade="all, delete-orphan"
    )

    projects = relationship("Project", back_populates="client")

    groups = relationship("Group", back_populates="client")

    sows = relationship("SOW", back_populates="client")

    history = relationship(
        "ClientHistory", back_populates="client", cascade="all, delete-orphan"
    )

    # Database constraints
    __table_args__ = (
        Index("idx_clients_status", "status"),
        Index("idx_clients_relation_type", "relation_type"),
        Index("uk_clients_name", "name", unique=True),
    )

    def __repr__(self) -> str:
        """String representation of the Client."""
        return f"<Client(id={self.id}, name='{self.name}', type='{self.relation_type.value}')>"

    def is_active(self) -> bool:
        """Check if client is active."""
        return self.status == ClientStatus.ACTIVE

    def get_primary_contact(self) -> Optional["ClientContact"]:
        """Get the primary contact for this client."""
        for contact in self.contacts:
            if contact.is_primary:
                return contact
        return None

    def activate(self) -> None:
        """Activate the client."""
        self.status = ClientStatus.ACTIVE

    def deactivate(self) -> None:
        """Deactivate the client."""
        self.status = ClientStatus.INACTIVE


class ClientContact(BaseModel):
    """
    Client contact model for managing contact information.

    Represents individual contacts within client organizations.
    """

    __tablename__ = "client_contacts"

    # Foreign key
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)

    # Contact information
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    role = Column(String(100), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="contacts")

    # Database indexes
    __table_args__ = (
        Index("idx_contacts_client_id", "client_id"),
        Index("idx_contacts_email", "email"),
    )

    def __repr__(self) -> str:
        """String representation of the ClientContact."""
        return f"<ClientContact(id={self.id}, name='{self.name}', client_id={self.client_id})>"

    def set_as_primary(self) -> None:
        """Set this contact as the primary contact."""
        self.is_primary = True


class ClientHistory(BaseModel):
    """
    Client history model for audit trail.

    Tracks all changes made to client records for compliance and auditing.
    """

    __tablename__ = "client_history"

    # Foreign keys
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Change tracking
    action = Column(Enum(ClientHistoryAction), nullable=False, index=True)
    changed_fields = Column(JSON, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    changed_at = Column(
        DateTime, nullable=False, default=BaseModel.created_at.default, index=True
    )

    # Relationships
    client = relationship("Client", back_populates="history")
    changed_by_user = relationship("User")

    # Database indexes
    __table_args__ = (
        Index("idx_client_history_client_id", "client_id"),
        Index("idx_client_history_action", "action"),
        Index("idx_client_history_changed_at", "changed_at"),
    )

    def __repr__(self) -> str:
        """String representation of the ClientHistory."""
        return f"<ClientHistory(id={self.id}, client_id={self.client_id}, action='{self.action.value}')>"
