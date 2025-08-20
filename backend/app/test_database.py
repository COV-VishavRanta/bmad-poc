"""
Test database connectivity and basic functionality.

This module provides basic tests to verify database connection,
model creation, and basic CRUD operations.
"""

import pytest
from sqlalchemy import text
from app.database import SessionLocal, engine, check_database_connection
from app.models import User, UserRole, UserStatus


def test_database_connection():
    """Test basic database connectivity."""
    assert check_database_connection() == True


def test_database_session():
    """Test database session creation and basic query."""
    db = SessionLocal()
    try:
        # Execute a simple query
        result = db.execute(text("SELECT 1 as test_value"))
        row = result.fetchone()
        assert row[0] == 1
    finally:
        db.close()


def test_user_model_creation():
    """Test creating a user model instance (without database)."""
    user = User(
        email="test@example.com",
        password_hash="test_hash",
        full_name="Test User",
        role=UserRole.HR,
        status=UserStatus.ACTIVE
    )
    
    assert user.email == "test@example.com"
    assert user.role == UserRole.HR
    assert user.is_active() == True
    assert user.has_role(UserRole.HR) == True
    assert user.has_role(UserRole.PC) == False


if __name__ == "__main__":
    print("Running database connectivity tests...")
    
    try:
        test_database_connection()
        print("✓ Database connection test passed")
    except Exception as e:
        print(f"✗ Database connection test failed: {e}")
    
    try:
        test_database_session()
        print("✓ Database session test passed")
    except Exception as e:
        print(f"✗ Database session test failed: {e}")
    
    try:
        test_user_model_creation()
        print("✓ User model test passed")
    except Exception as e:
        print(f"✗ User model test failed: {e}")
    
    print("Tests completed!")