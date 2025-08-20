# Coding Standards

## General Principles

### Code Quality
- Write self-documenting code with clear, descriptive names
- Follow SOLID principles for object-oriented design
- Maintain consistent formatting and style across the codebase
- Use meaningful commit messages following conventional commit format

### Documentation
- Document all public APIs and complex business logic
- Include inline comments for non-obvious code sections
- Maintain up-to-date README files for setup and usage
- Document architectural decisions and design patterns

## Frontend Standards (TypeScript/React)

### File Naming
- Components: PascalCase (`UserProfile.tsx`)
- Hooks: camelCase starting with "use" (`useUserData.ts`)
- Utilities: camelCase (`formatDate.ts`)
- Types: PascalCase (`UserType.ts`, `ApiResponse.ts`)

### Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks over class components
- Use arrow functions for inline functions and callbacks
- Destructure props and state for cleaner code

### React Best Practices
- Use React.memo() for performance optimization when appropriate
- Prefer composition over inheritance
- Keep components small and focused on single responsibility
- Use custom hooks to extract and reuse stateful logic

### TypeScript Guidelines
- Define explicit types for all props, state, and function parameters
- Use interfaces for object shapes, types for unions and primitives
- Avoid `any` type - use `unknown` or proper typing instead
- Use generic types for reusable components and functions

## Backend Standards (Python/FastAPI)

### File Naming
- Modules: snake_case (`user_service.py`)
- Classes: PascalCase (`UserService`)
- Functions and variables: snake_case (`get_user_data`)
- Constants: UPPER_SNAKE_CASE (`MAX_LOGIN_ATTEMPTS`)

### Code Style
- Follow PEP 8 style guidelines
- Use type hints for all function parameters and return values
- Maximum line length: 88 characters (Black formatter default)
- Use docstrings for all public functions and classes

### FastAPI Best Practices
- Use Pydantic models for request/response validation
- Implement proper error handling with custom exception classes
- Use dependency injection for database sessions and authentication
- Structure endpoints logically with proper HTTP status codes

### Database Guidelines
- Use SQLAlchemy models with proper relationships
- Implement proper database migrations with Alembic
- Use connection pooling for database performance
- Follow database naming conventions (snake_case)

## Testing Standards

### Frontend Testing
- Unit tests for utility functions and custom hooks
- Component tests using React Testing Library
- Integration tests for complex user flows
- Maintain test coverage above 80%

### Backend Testing
- Unit tests for business logic and utilities
- Integration tests for API endpoints
- Database tests using test database
- Mock external dependencies in tests

### Test Organization
- Co-locate test files with source files (`component.test.tsx`)
- Use descriptive test names that explain behavior
- Follow AAA pattern: Arrange, Act, Assert
- Group related tests using describe blocks

## Error Handling

### Frontend
- Use React Error Boundaries for component-level error handling
- Implement global error handling for API calls
- Show user-friendly error messages
- Log errors for debugging (development) and monitoring (production)

### Backend
- Use custom exception classes for different error types
- Implement global exception handlers in FastAPI
- Return consistent error response format
- Log errors with appropriate severity levels

## Security Standards

### Authentication
- Use HttpOnly cookies for session management
- Implement proper CSRF protection
- Validate and sanitize all user inputs
- Use secure session configuration

### Data Validation
- Validate all inputs on both frontend and backend
- Use Pydantic models for backend validation
- Implement proper authorization checks
- Sanitize data before database operations

## Performance Guidelines

### Frontend
- Implement code splitting and lazy loading
- Optimize bundle size with tree shaking
- Use React.memo and useMemo for expensive operations
- Implement proper image optimization

### Backend
- Use database indexing for frequently queried fields
- Implement proper caching strategies
- Optimize database queries to avoid N+1 problems
- Use connection pooling for database connections

## Version Control

### Git Workflow
- Use feature branches for development
- Write descriptive commit messages
- Perform code reviews before merging
- Keep commits atomic and focused

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Types: feat, fix, docs, style, refactor, test, chore