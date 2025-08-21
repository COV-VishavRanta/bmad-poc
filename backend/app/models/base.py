"""
Base model class with common fields and functionality.

This module provides the base class for all SQLAlchemy models with common
fields like id, timestamps, and standard methods.
"""

from datetime import datetime
from typing import Any, Dict

from sqlalchemy import Column, DateTime, Integer, func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class BaseModel(Base):
    """
    Base model class with common fields and methods.

    All database models should inherit from this class to get:
    - Primary key (id)
    - Created timestamp
    - Updated timestamp
    - Standard repr method
    """

    __abstract__ = True

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Timestamp fields
    created_at = Column(
        DateTime,
        nullable=False,
        default=func.current_timestamp(),
        server_default=func.current_timestamp(),
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        server_default=func.current_timestamp(),
    )

    def __repr__(self) -> str:
        """
        String representation of the model.

        Returns:
            str: String representation showing class name and id
        """
        return f"<{self.__class__.__name__}(id={self.id})>"

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert model instance to dictionary.

        Returns:
            Dict[str, Any]: Dictionary representation of the model
        """
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if isinstance(value, datetime):
                value = value.isoformat()
            result[column.name] = value
        return result

    def update_from_dict(self, data: Dict[str, Any]) -> None:
        """
        Update model fields from dictionary.

        Args:
            data: Dictionary with field names as keys and new values
        """
        for key, value in data.items():
            if hasattr(self, key) and key not in ["id", "created_at"]:
                setattr(self, key, value)

    @classmethod
    def get_column_names(cls) -> list[str]:
        """
        Get list of column names for this model.

        Returns:
            list[str]: List of column names
        """
        return [column.name for column in cls.__table__.columns]
