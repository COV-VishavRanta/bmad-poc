"""
Database seeding script for initial demo data.

This module provides functions to seed the database with initial users,
clients, and sample data for development and testing purposes.
"""

import os
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import (
    SOW,
    Assignment,
    AssignmentStatus,
    Client,
    ClientContact,
    ClientStatus,
    Group,
    Project,
    ProjectStatus,
    ProjectType,
    RelationType,
    SOWRole,
    SOWRoleName,
    SOWStatus,
    User,
    UserRole,
    UserStatus,
)
from app.utils.security import hash_password


def create_demo_users(db: Session) -> dict:
    """Create demo users for each role."""
    users = {}

    # Demo password for all users: TempPass123!
    demo_password_hash = hash_password("TempPass123!")

    # HR Manager
    hr_user = User(
        email="hr@example.com",
        password_hash=demo_password_hash,
        full_name="Sarah Johnson",
        role=UserRole.HR,
        status=UserStatus.ACTIVE,
    )
    db.add(hr_user)
    users["hr"] = hr_user

    # Project Coordinator
    pc_user = User(
        email="pc@example.com",
        password_hash=demo_password_hash,
        full_name="Mike Chen",
        role=UserRole.PC,
        status=UserStatus.ACTIVE,
    )
    db.add(pc_user)
    users["pc"] = pc_user

    # Resource Manager
    rm_user = User(
        email="rm@example.com",
        password_hash=demo_password_hash,
        full_name="Lisa Rodriguez",
        role=UserRole.RM,
        status=UserStatus.ACTIVE,
    )
    db.add(rm_user)
    users["rm"] = rm_user

    # Demo Developers
    dev1 = User(
        email="john.developer@example.com",
        password_hash=demo_password_hash,
        full_name="John Smith",
        role=UserRole.RM,  # Developers are managed by RM
        status=UserStatus.ACTIVE,
    )
    db.add(dev1)
    users["dev1"] = dev1

    dev2 = User(
        email="jane.frontend@example.com",
        password_hash=demo_password_hash,
        full_name="Jane Wilson",
        role=UserRole.RM,
        status=UserStatus.ACTIVE,
    )
    db.add(dev2)
    users["dev2"] = dev2

    db.commit()
    return users


def create_demo_clients(db: Session, users: dict) -> dict:
    """Create demo clients with contacts."""
    clients = {}

    # TechCorp Customer
    techcorp = Client(
        name="TechCorp Solutions",
        status=ClientStatus.ACTIVE,
        relation_type=RelationType.CUSTOMER,
        project_management_tool="Jira",
        comments="Large enterprise client with multiple ongoing projects",
        created_by=users["hr"].id,
    )
    db.add(techcorp)
    clients["techcorp"] = techcorp

    # Add primary contact for TechCorp
    techcorp_contact = ClientContact(
        client=techcorp,
        name="David Thompson",
        email="david.thompson@techcorp.com",
        phone="+1-555-0123",
        role="CTO",
        is_primary=True,
    )
    db.add(techcorp_contact)

    # StartupXYZ Customer
    startup = Client(
        name="StartupXYZ",
        status=ClientStatus.ACTIVE,
        relation_type=RelationType.CUSTOMER,
        project_management_tool="Asana",
        comments="Fast-growing startup, agile methodology",
        created_by=users["pc"].id,
    )
    db.add(startup)
    clients["startup"] = startup

    # Add contact for StartupXYZ
    startup_contact = ClientContact(
        client=startup,
        name="Emily Chen",
        email="emily@startupxyz.com",
        phone="+1-555-0456",
        role="Product Manager",
        is_primary=True,
    )
    db.add(startup_contact)

    # Partner Company
    partner = Client(
        name="DesignPartner Inc",
        status=ClientStatus.ACTIVE,
        relation_type=RelationType.PARTNER,
        project_management_tool="Trello",
        comments="Design partner for UI/UX collaboration",
        created_by=users["hr"].id,
    )
    db.add(partner)
    clients["partner"] = partner

    db.commit()
    return clients


def create_demo_sows(db: Session, clients: dict, users: dict) -> dict:
    """Create demo SOWs with roles."""
    sows = {}

    # TechCorp SOW
    techcorp_sow = SOW(
        name="TechCorp Platform Development 2025",
        description="Development of enterprise platform with backend APIs and frontend dashboard",
        status=SOWStatus.ACTIVE,
        client=clients["techcorp"],
        created_by=users["pc"].id,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 12, 31),
        total_fte=Decimal("3.5"),
    )
    db.add(techcorp_sow)
    sows["techcorp"] = techcorp_sow

    # Add SOW roles for TechCorp
    sow_roles_techcorp = [
        SOWRole(
            sow=techcorp_sow,
            role_name=SOWRoleName.BACKEND_DEVELOPER,
            fte_allocation=Decimal("1.0"),
            hourly_rate=Decimal("85.00"),
        ),
        SOWRole(
            sow=techcorp_sow,
            role_name=SOWRoleName.FRONTEND_DEVELOPER,
            fte_allocation=Decimal("1.0"),
            hourly_rate=Decimal("80.00"),
        ),
        SOWRole(
            sow=techcorp_sow,
            role_name=SOWRoleName.ARCHITECT,
            fte_allocation=Decimal("0.5"),
            hourly_rate=Decimal("120.00"),
        ),
        SOWRole(
            sow=techcorp_sow,
            role_name=SOWRoleName.PROJECT_MANAGER,
            fte_allocation=Decimal("0.5"),
            hourly_rate=Decimal("90.00"),
        ),
        SOWRole(
            sow=techcorp_sow,
            role_name=SOWRoleName.TESTER,
            fte_allocation=Decimal("0.5"),
            hourly_rate=Decimal("65.00"),
        ),
    ]
    for role in sow_roles_techcorp:
        db.add(role)

    # StartupXYZ SOW
    startup_sow = SOW(
        name="StartupXYZ MVP Development",
        description="Rapid development of minimum viable product",
        status=SOWStatus.ACTIVE,
        client=clients["startup"],
        created_by=users["pc"].id,
        start_date=date(2025, 3, 1),
        end_date=date(2025, 8, 31),
        total_fte=Decimal("2.0"),
    )
    db.add(startup_sow)
    sows["startup"] = startup_sow

    # Add SOW roles for StartupXYZ
    sow_roles_startup = [
        SOWRole(
            sow=startup_sow,
            role_name=SOWRoleName.BACKEND_DEVELOPER,
            fte_allocation=Decimal("0.75"),
            hourly_rate=Decimal("80.00"),
        ),
        SOWRole(
            sow=startup_sow,
            role_name=SOWRoleName.FRONTEND_DEVELOPER,
            fte_allocation=Decimal("0.75"),
            hourly_rate=Decimal("75.00"),
        ),
        SOWRole(
            sow=startup_sow,
            role_name=SOWRoleName.DESIGNER,
            fte_allocation=Decimal("0.5"),
            hourly_rate=Decimal("70.00"),
        ),
    ]
    for role in sow_roles_startup:
        db.add(role)

    db.commit()
    return sows


def create_demo_projects(db: Session, clients: dict, sows: dict, users: dict) -> dict:
    """Create demo projects."""
    projects = {}

    # TechCorp Backend Project
    techcorp_backend = Project(
        name="Enterprise API Development",
        description="Backend APIs for enterprise platform",
        project_type=ProjectType.DEVELOPMENT,
        status=ProjectStatus.ACTIVE,
        client=clients["techcorp"],
        sow=sows["techcorp"],
        created_by=users["pc"].id,
        start_date=date(2025, 2, 1),
        end_date=date(2025, 10, 31),
    )
    db.add(techcorp_backend)
    projects["techcorp_backend"] = techcorp_backend

    # TechCorp Frontend Project
    techcorp_frontend = Project(
        name="Enterprise Dashboard",
        description="React-based dashboard for enterprise users",
        project_type=ProjectType.DEVELOPMENT,
        status=ProjectStatus.ACTIVE,
        client=clients["techcorp"],
        sow=sows["techcorp"],
        created_by=users["pc"].id,
        start_date=date(2025, 3, 1),
        end_date=date(2025, 11, 30),
    )
    db.add(techcorp_frontend)
    projects["techcorp_frontend"] = techcorp_frontend

    # StartupXYZ MVP
    startup_mvp = Project(
        name="MVP Product Development",
        description="Full-stack MVP development",
        project_type=ProjectType.DEVELOPMENT,
        status=ProjectStatus.ACTIVE,
        client=clients["startup"],
        sow=sows["startup"],
        created_by=users["pc"].id,
        start_date=date(2025, 3, 15),
        end_date=date(2025, 7, 15),
    )
    db.add(startup_mvp)
    projects["startup_mvp"] = startup_mvp

    db.commit()
    return projects


def create_demo_assignments(db: Session, users: dict, projects: dict) -> list:
    """Create demo team assignments."""
    assignments = []

    # John (Backend Developer) assigned to TechCorp Backend
    assignment1 = Assignment(
        user=users["dev1"],
        project=projects["techcorp_backend"],
        created_by=users["rm"].id,
        role_name="Backend Developer",
        fte_allocation=Decimal("1.0"),
        status=AssignmentStatus.ACTIVE,
        start_date=date(2025, 2, 1),
        end_date=date(2025, 10, 31),
        notes="Lead backend developer for enterprise APIs",
    )
    db.add(assignment1)
    assignments.append(assignment1)

    # Jane (Frontend Developer) assigned to TechCorp Frontend
    assignment2 = Assignment(
        user=users["dev2"],
        project=projects["techcorp_frontend"],
        created_by=users["rm"].id,
        role_name="Frontend Developer",
        fte_allocation=Decimal("0.8"),
        status=AssignmentStatus.ACTIVE,
        start_date=date(2025, 3, 1),
        end_date=date(2025, 11, 30),
        notes="Frontend lead for React dashboard",
    )
    db.add(assignment2)
    assignments.append(assignment2)

    # Jane also partially assigned to StartupXYZ
    assignment3 = Assignment(
        user=users["dev2"],
        project=projects["startup_mvp"],
        created_by=users["rm"].id,
        role_name="Frontend Developer",
        fte_allocation=Decimal("0.2"),
        status=AssignmentStatus.PLANNED,
        start_date=date(2025, 4, 1),
        end_date=date(2025, 7, 15),
        notes="Part-time support for startup MVP",
    )
    db.add(assignment3)
    assignments.append(assignment3)

    db.commit()
    return assignments


def is_database_empty(db: Session) -> bool:
    """Check if database has any users (indicating it's already seeded)."""
    return db.query(User).count() == 0


def seed_database():
    """Main seeding function to populate database with demo data."""
    db = SessionLocal()
    try:
        # Check if database is already seeded
        if not is_database_empty(db):
            print("Database already contains data. Skipping seeding.")
            return

        print("Seeding database with demo data...")

        # Create demo data
        users = create_demo_users(db)
        print(f"Created {len(users)} demo users")

        clients = create_demo_clients(db, users)
        print(f"Created {len(clients)} demo clients")

        sows = create_demo_sows(db, clients, users)
        print(f"Created {len(sows)} demo SOWs")

        projects = create_demo_projects(db, clients, sows, users)
        print(f"Created {len(projects)} demo projects")

        assignments = create_demo_assignments(db, users, projects)
        print(f"Created {len(assignments)} demo assignments")

        print("Database seeding completed successfully!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
