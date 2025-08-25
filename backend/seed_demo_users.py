"""
Database seeding script for demo users.

This script creates demo users for each role (HR, PC, RM)
for testing and development purposes.
"""

import os
import sys
from typing import List

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Override DATABASE_URL for local development
os.environ['DATABASE_URL'] = 'mysql+pymysql://root:password@localhost:3306/bmad_db'

from sqlalchemy.orm import Session
from app.database import SessionLocal, create_tables
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.user_service import UserService
from app.exceptions import UserAlreadyExistsError


def create_demo_users(db: Session) -> List[User]:
    """
    Create demo users for testing.
    
    Args:
        db: Database session
        
    Returns:
        List of created users
    """
    user_service = UserService(db)
    
    demo_users_data = [
        {
            "email": "hr.demo@bmad.com",
            "password": "hrpassword123",
            "first_name": "Hannah",
            "last_name": "Rodriguez",
            "role": "HR",
            "is_active": True
        },
        {
            "email": "pc.demo@bmad.com",
            "password": "pcpassword123",
            "first_name": "Peter",
            "last_name": "Chen",
            "role": "PC",
            "is_active": True
        },
        {
            "email": "rm.demo@bmad.com",
            "password": "rmpassword123",
            "first_name": "Rachel",
            "last_name": "Martinez",
            "role": "RM",
            "is_active": True
        }
    ]
    
    created_users = []
    
    for user_data in demo_users_data:
        try:
            user_create = UserCreate(**user_data)
            user = user_service.create_user(user_create)
            created_users.append(user)
            print(f"✓ Created demo user: {user.email} ({user.role})")
        except UserAlreadyExistsError:
            print(f"• Demo user already exists: {user_data['email']} ({user_data['role']})")
            # Get existing user
            existing_user = user_service.get_user_by_email(user_data['email'])
            if existing_user:
                created_users.append(existing_user)
    
    return created_users


def seed_database():
    """
    Main function to seed the database with demo data.
    """
    print("🌱 Starting database seeding...")
    
    # Create tables if they don't exist
    create_tables()
    print("✓ Database tables created/verified")
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Create demo users
        users = create_demo_users(db)
        
        print(f"\n🎉 Database seeding completed!")
        print(f"Created/verified {len(users)} demo users:")
        
        for user in users:
            print(f"  • {user.full_name} ({user.email}) - Role: {user.role}")
        
        print("\n📝 Demo User Credentials:")
        print("  HR User: hr.demo@bmad.com / hrpassword123")
        print("  PC User: pc.demo@bmad.com / pcpassword123")
        print("  RM User: rm.demo@bmad.com / rmpassword123")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()