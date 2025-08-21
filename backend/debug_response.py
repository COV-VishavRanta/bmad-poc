#!/usr/bin/env python3

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.abspath('.'))

from fastapi.testclient import TestClient
from app.main import app
from app.tests.conftest import *
import pytest
import tempfile
import sqlite3

def test_response_format():
    # Create test database
    test_engine = create_engine("sqlite:///./test_debug.db", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    
    # Create tables
    Base.metadata.create_all(bind=test_engine)
    
    db = TestingSessionLocal()
    
    try:
        # Create test users
        hr_user = User(
            email="hr@example.com",
            password_hash=hash_password("TestPass123!"),
            full_name="HR User",
            role=UserRole.HR,
            status=UserStatus.ACTIVE,
        )
        pc_user = User(
            email="pc@example.com",
            password_hash=hash_password("TestPass123!"),
            full_name="PC User",
            role=UserRole.PC,
            status=UserStatus.ACTIVE,
        )
        
        db.add(hr_user)
        db.add(pc_user)
        db.commit()
        db.refresh(hr_user)
        db.refresh(pc_user)
        
        # Override dependencies
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[require_auth] = lambda: pc_user
        
        with TestClient(app) as client:
            response = client.get("/api/users")
            print(f"Status code: {response.status_code}")
            print(f"Response JSON: {response.json()}")
            print(f"Response headers: {dict(response.headers)}")
            
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)
        app.dependency_overrides.clear()
        
        # Clean up test database
        if os.path.exists("./test_debug.db"):
            os.remove("./test_debug.db")

if __name__ == "__main__":
    test_response_format()