"""
Database configuration and connection management.

This module provides SQLAlchemy database setup, session management,
and utility functions for database operations.
"""

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "mysql+pymysql://root:password@localhost:3306/bmad_db"
)

# Database engine and session configuration
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    
    Yields:
        SQLAlchemy database session
        
    Note:
        Session is automatically closed after use
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """
    Create all database tables defined in SQLAlchemy models.
    
    Note:
        This should be replaced with Alembic migrations in production
    """
    Base.metadata.create_all(bind=engine)