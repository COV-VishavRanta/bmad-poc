"""
User audit history model for tracking user management changes.

This module defines the UserHistory model for tracking all changes
made to user accounts including role changes, status updates, and
other modifications for compliance and auditing purposes.
"""

from datetime import datetime
from typing import Dict, Any, Optional

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class UserHistory(BaseModel):
    """
    User history model for audit trail tracking.

    Tracks all changes made to user accounts including who made the change,
    what was changed, and when it occurred. This provides a complete audit
    trail for compliance and security purposes.
    """

    __tablename__ = "user_history"

    # User being tracked
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Action performed
    action = Column(String(100), nullable=False, index=True)

    # Change details
    changed_fields = Column(JSON, nullable=False)  # List of field names changed
    old_values = Column(JSON, nullable=True)  # Previous values
    new_values = Column(JSON, nullable=True)  # New values

    # Who made the change
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # When the change was made (uses created_at from BaseModel)
    # Additional metadata for forensics
    ip_address = Column(String(45), nullable=True)  # Supports IPv6
    user_agent = Column(Text, nullable=True)

    # Relationships
    user = relationship(
        "User",
        foreign_keys=[user_id],
        backref="audit_history"
    )

    changed_by_user = relationship(
        "User",
        foreign_keys=[changed_by],
        backref="changes_made"
    )

    # Database indexes
    __table_args__ = (
        Index("idx_user_history_user_id", "user_id"),
        Index("idx_user_history_action", "action"),
        Index("idx_user_history_changed_by", "changed_by"),
        Index("idx_user_history_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        """String representation of the UserHistory."""
        return f"<UserHistory(id={self.id}, user_id={self.user_id}, action='{self.action}')>"

    @classmethod
    def create_history_entry(
        cls,
        user_id: int,
        action: str,
        changed_fields: list[str],
        changed_by: int,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> "UserHistory":
        """
        Create a new history entry for user changes.

        Args:
            user_id: ID of the user being modified
            action: Action performed (e.g., 'created', 'role_changed', 'deactivated')
            changed_fields: List of field names that were changed
            old_values: Dictionary of previous values
            new_values: Dictionary of new values
            changed_by: ID of the user making the change
            ip_address: IP address of the user making the change
            user_agent: User agent of the user making the change

        Returns:
            UserHistory: New history entry instance
        """
        return cls(
            user_id=user_id,
            action=action,
            changed_fields=changed_fields,
            old_values=old_values,
            new_values=new_values,
            changed_by=changed_by,
            ip_address=ip_address,
            user_agent=user_agent,
        )