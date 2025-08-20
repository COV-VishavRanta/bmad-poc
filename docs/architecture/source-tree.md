# Project Source Tree Structure

## Root Directory Structure

```
clientops/
├── frontend/                    # Next.js frontend application
├── backend/                     # FastAPI backend application
├── docs/                       # Project documentation
├── .github/                    # GitHub workflows and templates
├── docker-compose.yml          # Docker orchestration
├── .env.example               # Environment variables template
├── README.md                  # Project overview and setup
└── .gitignore                 # Git ignore rules
```

## Frontend Structure (`frontend/`)

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth route group
│   │   │   ├── login/         # Login page
│   │   │   └── layout.tsx     # Auth layout
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── clients/           # Client management pages
│   │   ├── projects/          # Project management pages
│   │   ├── sows/              # SOW management pages
│   │   ├── assignments/       # Team assignment pages
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Basic UI components
│   │   ├── forms/            # Form components
│   │   ├── navigation/       # Navigation components
│   │   └── common/           # Common shared components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility libraries
│   │   ├── api.ts           # API client configuration
│   │   ├── auth.ts          # Authentication utilities
│   │   ├── utils.ts         # General utilities
│   │   └── validations.ts   # Form validation schemas
│   ├── store/               # State management
│   │   ├── auth.ts         # Authentication store
│   │   ├── clients.ts      # Clients store
│   │   └── projects.ts     # Projects store
│   ├── types/              # TypeScript type definitions
│   │   ├── api.ts         # API response types
│   │   ├── auth.ts        # Authentication types
│   │   └── entities.ts    # Business entity types
│   └── middleware.ts       # Next.js middleware
├── public/                 # Static assets
│   ├── images/            # Image assets
│   └── icons/             # Icon assets
├── .env.local             # Local environment variables
├── .eslintrc.json         # ESLint configuration
├── .gitignore             # Frontend-specific git ignore
├── Dockerfile             # Frontend Docker configuration
├── next.config.js         # Next.js configuration
├── package.json           # Node.js dependencies
├── tailwind.config.js     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Backend Structure (`backend/`)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI application entry point
│   ├── config.py              # Application configuration
│   ├── database.py            # Database configuration
│   ├── dependencies.py        # FastAPI dependencies
│   ├── middleware.py          # Custom middleware
│   ├── api/                   # API routes
│   │   ├── __init__.py
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── clients.py        # Client management endpoints
│   │   ├── projects.py       # Project management endpoints
│   │   ├── groups.py         # Group management endpoints
│   │   ├── sows.py           # SOW management endpoints
│   │   └── assignments.py    # Assignment management endpoints
│   ├── models/               # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── base.py          # Base model class
│   │   ├── user.py          # User model
│   │   ├── client.py        # Client models
│   │   ├── project.py       # Project models
│   │   ├── sow.py           # SOW models
│   │   └── assignment.py    # Assignment models
│   ├── schemas/             # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── auth.py         # Authentication schemas
│   │   ├── client.py       # Client schemas
│   │   ├── project.py      # Project schemas
│   │   ├── sow.py          # SOW schemas
│   │   └── assignment.py   # Assignment schemas
│   ├── services/           # Business logic services
│   │   ├── __init__.py
│   │   ├── auth_service.py # Authentication business logic
│   │   ├── client_service.py # Client business logic
│   │   ├── project_service.py # Project business logic
│   │   └── assignment_service.py # Assignment business logic
│   ├── utils/              # Utility functions
│   │   ├── __init__.py
│   │   ├── security.py     # Security utilities
│   │   ├── validators.py   # Custom validators
│   │   └── helpers.py      # General helper functions
│   └── tests/              # Test files
│       ├── __init__.py
│       ├── conftest.py     # Test configuration
│       ├── test_auth.py    # Authentication tests
│       ├── test_clients.py # Client tests
│       └── test_projects.py # Project tests
├── alembic/                # Database migrations
│   ├── versions/           # Migration files
│   ├── env.py             # Alembic configuration
│   └── script.py.mako     # Migration template
├── .env                   # Environment variables
├── .gitignore             # Backend-specific git ignore
├── alembic.ini            # Alembic configuration
├── Dockerfile             # Backend Docker configuration
├── pyproject.toml         # Python project configuration
└── requirements.txt       # Python dependencies
```

## Documentation Structure (`docs/`)

```
docs/
├── architecture/          # Architecture documentation
│   ├── tech-stack.md     # Technology stack overview
│   ├── coding-standards.md # Coding standards and conventions
│   ├── database-schema.md # Database schema documentation
│   ├── api-documentation.md # API documentation
│   └── deployment.md     # Deployment guidelines
├── prd/                  # Product requirements (epics)
│   ├── epic-1-project-setup.md
│   ├── epic-2-authentication.md
│   └── ...
└── stories/              # User stories
    ├── 1.1.story.md     # Story files
    ├── 1.2.story.md
    └── ...
```

## File Naming Conventions

### Frontend
- **Components**: PascalCase (`ClientCard.tsx`, `ProjectForm.tsx`)
- **Pages**: kebab-case directories with page.tsx (`clients/page.tsx`)
- **Hooks**: camelCase with "use" prefix (`useAuthStore.ts`)
- **Utilities**: camelCase (`formatDate.ts`, `apiClient.ts`)
- **Types**: PascalCase (`ClientType.ts`, `ApiResponse.ts`)

### Backend
- **Modules**: snake_case (`client_service.py`, `auth_middleware.py`)
- **Classes**: PascalCase (`ClientService`, `UserModel`)
- **Functions**: snake_case (`get_user_by_id`, `validate_email`)

### Database
- **Tables**: snake_case (`users`, `client_history`, `project_assignments`)
- **Columns**: snake_case (`user_id`, `created_at`, `full_name`)
- **Indexes**: descriptive names (`idx_users_email`, `idx_projects_client_id`)

## Import Organization

### Frontend TypeScript
```typescript
// 1. External libraries
import React from 'react'
import { NextPage } from 'next'

// 2. Internal utilities and types
import { ApiClient } from '@/lib/api'
import { ClientType } from '@/types/entities'

// 3. Components
import { ClientCard } from '@/components/clients/ClientCard'
```

### Backend Python
```python
# 1. Standard library
from datetime import datetime
from typing import Optional

# 2. Third-party packages
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

# 3. Local imports
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginSchema
```