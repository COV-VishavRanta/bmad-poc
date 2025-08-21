# Development Guide

This guide provides detailed information for developers working on the ClientOps project.

## 🏗️ Architecture Overview

### System Design

ClientOps follows a modern microservices architecture with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │    Database     │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│    (MySQL)      │
│   Port 3000     │    │   Port 8000     │    │   Port 3306     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend Architecture
- **Framework**: Next.js 15 with App Router
- **Runtime**: React 19 with Concurrent Features
- **Language**: TypeScript 5.9 with strict mode
- **Styling**: Tailwind CSS v4 + Material-UI v5
- **State Management**: React Context + Custom hooks
- **Build Tool**: Turbopack for fast development

#### Backend Architecture
- **Framework**: FastAPI with async/await
- **Language**: Python 3.11+ with type hints
- **Database**: SQLAlchemy 2.0 with async support
- **Validation**: Pydantic v2 for schemas
- **Migrations**: Alembic for database versioning
- **Authentication**: JWT-based (planned)

#### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development
- **Database**: MySQL 8.0 with persistent volumes
- **Networking**: Custom bridge network

## 🗄️ Database Design

### Entity Relationship Diagram

```
Users
├── id (PK)
├── email (unique)
├── name
├── role
└── created_at

Clients
├── id (PK)
├── name
├── contact_email
├── contact_phone
└── created_at

Projects
├── id (PK)
├── client_id (FK)
├── name
├── description
├── status
├── start_date
├── end_date
└── budget

SOWs (Statements of Work)
├── id (PK)
├── project_id (FK)
├── title
├── content
├── status
├── approved_by
└── created_at

Teams
├── id (PK)
├── name
├── description
└── created_at

Assignments
├── id (PK)
├── user_id (FK)
├── project_id (FK)
├── role
├── start_date
├── end_date
└── allocation_percentage
```

### Database Conventions

#### Naming Conventions
- **Tables**: Plural nouns (e.g., `users`, `projects`)
- **Columns**: Snake_case (e.g., `created_at`, `contact_email`)
- **Primary Keys**: Always `id`
- **Foreign Keys**: `{table_name}_id` (e.g., `user_id`, `project_id`)

#### Data Types
- **IDs**: UUID or Auto-increment Integer
- **Timestamps**: `DATETIME` with timezone
- **Text**: `VARCHAR` with appropriate limits
- **JSON**: Use `JSON` type for structured data

#### Indexes
- Primary keys are automatically indexed
- Foreign keys should be indexed
- Add indexes for frequently queried columns
- Use composite indexes for multi-column queries

## 🎨 Frontend Development

### Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/         # Route groups
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   ├── components/         # Reusable components
│   │   ├── ui/            # Basic UI components
│   │   ├── forms/         # Form components
│   │   └── layout/        # Layout components
│   ├── lib/               # Utilities and config
│   │   ├── api.ts         # API client
│   │   ├── auth.ts        # Authentication
│   │   └── utils.ts       # Helper functions
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   └── theme/             # Material-UI theme
├── public/                # Static assets
└── docs/                  # Component documentation
```

### Component Guidelines

#### Component Structure
```typescript
// UserCard.tsx
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onDelete,
  className,
}) => {
  // Component logic here
  
  return (
    <Card className={className}>
      {/* Component JSX */}
    </Card>
  );
};

UserCard.displayName = 'UserCard';
```

#### Styling Approach
- **Tailwind CSS**: For utility-first styling
- **Material-UI**: For complex components and theming
- **CSS Modules**: For component-specific styles (when needed)

```typescript
// Example: Combining Tailwind with MUI
import { Button } from '@mui/material';
import { cn } from '@/lib/utils';

export const CustomButton = ({ className, ...props }) => (
  <Button
    className={cn(
      'px-4 py-2 rounded-lg font-medium transition-colors',
      'hover:bg-blue-600 active:bg-blue-700',
      className
    )}
    {...props}
  />
);
```

#### State Management
```typescript
// Context for global state
const AppContext = createContext<AppState | null>(null);

// Custom hook for accessing context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

// Provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
```

### API Integration

#### API Client Setup
```typescript
// lib/api.ts
class ApiClient {
  private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // CRUD methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }
  
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
```

#### Custom Hooks for Data Fetching
```typescript
// hooks/useUsers.ts
export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<User[]>('/api/users');
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  return { users, loading, error, refetch: fetchUsers };
};
```

## 🔧 Backend Development

### Project Structure

```
backend/
├── app/
│   ├── api/               # API routes
│   │   ├── v1/           # API version 1
│   │   │   ├── users.py  # User endpoints
│   │   │   └── projects.py
│   │   └── health.py     # Health check
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings
│   │   ├── security.py   # Authentication
│   │   └── database.py   # Database connection
│   ├── models/           # SQLAlchemy models
│   │   ├── base.py       # Base model
│   │   ├── user.py       # User model
│   │   └── project.py    # Project model
│   ├── schemas/          # Pydantic schemas
│   │   ├── user.py       # User schemas
│   │   └── project.py    # Project schemas
│   ├── services/         # Business logic
│   │   ├── user_service.py
│   │   └── project_service.py
│   └── main.py           # FastAPI application
├── alembic/              # Database migrations
├── tests/                # Test files
└── requirements.txt      # Dependencies
```

### API Development

#### Route Structure
```python
# api/v1/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Create a new user."""
    service = UserService(db)
    user = await service.create_user(user_data)
    return UserResponse.from_orm(user)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Get user by ID."""
    service = UserService(db)
    user = await service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.from_orm(user)
```

#### Service Layer
```python
# services/user_service.py
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        user = User(**user_data.dict())
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def get_user(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_users(
        self, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[User]:
        """Get all users with pagination."""
        result = await self.db.execute(
            select(User).offset(skip).limit(limit)
        )
        return result.scalars().all()
```

#### Database Models
```python
# models/user.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.models.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
```

#### Pydantic Schemas
```python
# schemas/user.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    name: str
    is_active: bool = True

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

### Database Operations

#### Migration Workflow
```bash
# Create new migration
alembic revision --autogenerate -m "Add user table"

# Review generated migration
# Edit if necessary

# Apply migration
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

#### Query Optimization
```python
# Efficient queries with relationships
async def get_projects_with_users(db: AsyncSession) -> List[Project]:
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.users))
        .where(Project.is_active == True)
    )
    return result.scalars().unique().all()

# Pagination
async def get_paginated_users(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20
) -> PaginatedResponse[User]:
    offset = (page - 1) * page_size
    
    # Get total count
    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar()
    
    # Get paginated results
    result = await db.execute(
        select(User)
        .offset(offset)
        .limit(page_size)
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    
    return PaginatedResponse(
        items=users,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size)
    )
```

## 🧪 Testing Strategy

### Test Structure

```
tests/
├── unit/                  # Unit tests
│   ├── test_services.py   # Service layer tests
│   └── test_models.py     # Model tests
├── integration/           # Integration tests
│   ├── test_api.py        # API endpoint tests
│   └── test_database.py   # Database tests
├── e2e/                   # End-to-end tests (planned)
├── fixtures/              # Test data
└── conftest.py            # Pytest configuration
```

### Backend Testing

#### Service Tests
```python
# tests/unit/test_user_service.py
import pytest
from app.services.user_service import UserService
from app.schemas.user import UserCreate

@pytest.mark.asyncio
async def test_create_user(db_session):
    service = UserService(db_session)
    user_data = UserCreate(
        email="test@example.com",
        name="Test User"
    )
    
    user = await service.create_user(user_data)
    
    assert user.email == user_data.email
    assert user.name == user_data.name
    assert user.is_active is True
    assert user.id is not None
```

#### API Tests
```python
# tests/integration/test_users_api.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_user_endpoint(client: AsyncClient):
    user_data = {
        "email": "test@example.com",
        "name": "Test User"
    }
    
    response = await client.post("/api/v1/users/", json=user_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["name"] == user_data["name"]
    assert "id" in data
```

### Frontend Testing

#### Component Tests
```typescript
// __tests__/components/UserCard.test.tsx
import { render, screen } from '@testing-library/react';
import { UserCard } from '@/components/UserCard';

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  isActive: true,
};

describe('UserCard', () => {
  it('renders user information', () => {
    render(<UserCard user={mockUser} />);
    
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });
  
  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<UserCard user={mockUser} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    expect(onEdit).toHaveBeenCalledWith(mockUser);
  });
});
```

#### Hook Tests
```typescript
// __tests__/hooks/useUsers.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useUsers } from '@/hooks/useUsers';

jest.mock('@/lib/api');

describe('useUsers', () => {
  it('fetches users on mount', async () => {
    const mockUsers = [{ id: '1', name: 'Test User' }];
    (api.get as jest.Mock).mockResolvedValue(mockUsers);
    
    const { result } = renderHook(() => useUsers());
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.users).toEqual(mockUsers);
    });
  });
});
```

## 🚀 Development Workflow

### Daily Development

1. **Start Development Environment**
   ```bash
   ./dev-start.sh
   ```

2. **Make Changes**
   - Edit code with hot reload
   - Test changes automatically

3. **Quality Checks**
   ```bash
   # Frontend
   cd frontend
   npm run check-all
   
   # Backend
   cd backend
   make lint
   make test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add user management"
   ```

### Performance Monitoring

#### Frontend Performance
- **Core Web Vitals**: Monitor LCP, FID, CLS
- **Bundle Size**: Use `npm run build:analyze`
- **Runtime Performance**: React DevTools Profiler

#### Backend Performance
- **Response Times**: FastAPI automatic metrics
- **Database Queries**: SQLAlchemy query logging
- **Memory Usage**: Process monitoring

### Debugging

#### Frontend Debugging
```typescript
// Debug API calls
const api = {
  async request(url: string, options: RequestInit = {}) {
    console.log(`API Request: ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, options);
    console.log(`API Response: ${response.status}`);
    return response;
  }
};

// Debug React renders
const UserComponent = ({ user }) => {
  console.log('UserComponent render:', user);
  return <div>{user.name}</div>;
};
```

#### Backend Debugging
```python
# Debug database queries
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Debug FastAPI requests
import uvicorn
uvicorn.run(
    "app.main:app",
    host="0.0.0.0",
    port=8000,
    reload=True,
    log_level="debug"
)
```

## 📊 Performance Guidelines

### Frontend Optimization

1. **Code Splitting**: Use dynamic imports
2. **Image Optimization**: Next.js Image component
3. **Caching**: Implement proper cache headers
4. **Bundle Size**: Keep bundles under reasonable limits

### Backend Optimization

1. **Database Indexing**: Index frequently queried columns
2. **Query Optimization**: Use select_related and prefetch_related
3. **Caching**: Implement Redis for frequent queries
4. **Connection Pooling**: Configure SQLAlchemy pool settings

### Development Environment

1. **Hot Reload**: Optimized file watching
2. **Build Speed**: Turbopack for fast builds
3. **Docker**: Optimized layer caching
4. **Development Tools**: Fast linting and type checking

---

This development guide provides the foundation for contributing to ClientOps. For specific implementation details, refer to the inline code documentation and API docs.