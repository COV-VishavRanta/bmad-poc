# Contributing to ClientOps

Thank you for your interest in contributing to ClientOps! This guide will help you get started with contributing to the project.

## 🤝 How to Contribute

### Types of Contributions

We welcome several types of contributions:

- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest new functionality
- **Code Contributions**: Submit bug fixes or new features
- **Documentation**: Improve or add documentation
- **Testing**: Help improve test coverage

## 🚀 Getting Started

### Prerequisites

1. **Development Environment**: Set up the development environment following the README.md
2. **Git Knowledge**: Basic understanding of Git and GitHub workflow
3. **Technology Stack**: Familiarity with our tech stack (Next.js, FastAPI, TypeScript, Python)

### Setting Up Your Development Environment

1. **Fork the Repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/bmad-poc.git
   cd bmad-poc
   ```

2. **Set Up Remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/bmad-poc.git
   ```

3. **Install Dependencies**
   ```bash
   # Follow the setup instructions in README.md
   ./dev-start.sh  # or dev-start.bat on Windows
   ```

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
# Ensure you're on main and up to date
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- **Follow coding standards** (see below)
- **Write tests** for new functionality
- **Update documentation** if needed
- **Keep commits small and focused**

### 3. Test Your Changes

```bash
# Run all quality checks
./test-automation.sh quality

# Run all tests
./test-automation.sh all

# Check health
./dev-health.sh
```

### 4. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
git add .
git commit -m "feat: add user authentication middleware"
```

#### Commit Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 📝 Coding Standards

### Python (Backend)

#### Code Style
- **PEP 8** compliance
- **Line length**: 88 characters (Black default)
- **Type hints**: Required for all functions
- **Docstrings**: Google style for public functions

#### Tools
```bash
# Format code
make format

# Lint code
make lint

# Type check
make type-check
```

#### Example:
```python
from typing import List, Optional
from pydantic import BaseModel

class UserCreate(BaseModel):
    """Schema for creating a new user."""
    
    email: str
    name: str
    is_active: Optional[bool] = True

async def create_user(user_data: UserCreate) -> User:
    """Create a new user in the database.
    
    Args:
        user_data: User creation data
        
    Returns:
        Created user instance
        
    Raises:
        ValueError: If email already exists
    """
    # Implementation here
    pass
```

### TypeScript (Frontend)

#### Code Style
- **ESLint** configuration compliance
- **Prettier** formatting
- **Strict TypeScript** mode
- **Line length**: 100 characters

#### Tools
```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check
```

#### Example:
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
}

interface CreateUserProps {
  onSuccess: (user: User) => void;
  onError: (error: string) => void;
}

export const CreateUserForm: React.FC<CreateUserProps> = ({
  onSuccess,
  onError,
}) => {
  // Component implementation
};
```

### Database Migrations

#### Creating Migrations
```bash
# Auto-generate migration
./db-manage.sh create "Add user authentication table"

# Review generated migration before applying
# Edit if necessary
./db-manage.sh upgrade
```

#### Migration Guidelines
- **Descriptive names**: Use clear, descriptive migration messages
- **Backward compatibility**: Ensure migrations can be rolled back
- **Data migrations**: Separate schema and data changes when possible
- **Review carefully**: Always review auto-generated migrations

## 🧪 Testing Guidelines

### Writing Tests

#### Backend Tests (pytest)
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_user():
    """Test user creation endpoint."""
    user_data = {
        "email": "test@example.com",
        "name": "Test User"
    }
    
    response = client.post("/api/users", json=user_data)
    
    assert response.status_code == 201
    assert response.json()["email"] == user_data["email"]
```

#### Frontend Tests (Jest + React Testing Library)
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateUserForm } from './CreateUserForm';

describe('CreateUserForm', () => {
  it('submits form with valid data', async () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();
    
    render(<CreateUserForm onSuccess={onSuccess} onError={onError} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

### Test Coverage

- **Minimum coverage**: 80% for new code
- **Critical paths**: 100% coverage for authentication, payment, data validation
- **Test types**: Unit tests, integration tests, E2E tests (planned)

## 📚 Documentation Standards

### Code Documentation

#### Python Docstrings (Google Style)
```python
def calculate_project_budget(
    hours: int, 
    hourly_rate: float, 
    overhead: float = 0.1
) -> float:
    """Calculate total project budget including overhead.
    
    Args:
        hours: Total project hours
        hourly_rate: Rate per hour in USD
        overhead: Overhead percentage (default: 0.1)
        
    Returns:
        Total budget including overhead
        
    Raises:
        ValueError: If hours or hourly_rate is negative
        
    Example:
        >>> calculate_project_budget(100, 50.0, 0.15)
        5750.0
    """
```

#### TypeScript Documentation (JSDoc)
```typescript
/**
 * Calculate project timeline based on complexity and team size
 * 
 * @param complexity - Project complexity score (1-10)
 * @param teamSize - Number of team members
 * @param bufferDays - Additional buffer days for risks
 * @returns Estimated project duration in days
 * 
 * @example
 * ```typescript
 * const duration = calculateTimeline(7, 4, 5);
 * console.log(`Project will take ${duration} days`);
 * ```
 */
export function calculateTimeline(
  complexity: number,
  teamSize: number,
  bufferDays: number = 0
): number {
  // Implementation
}
```

### README Updates

When adding new features:
1. Update relevant sections in README.md
2. Add new environment variables to .env.example
3. Update Docker configuration if needed
4. Add troubleshooting section if applicable

## 🔍 Pull Request Process

### Before Submitting

1. **Rebase on latest main**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run full test suite**
   ```bash
   ./test-automation.sh ci
   ```

3. **Update documentation**
4. **Self-review your changes**

### Pull Request Template

Use this template for your PR description:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or marked as breaking)
```

### Review Process

1. **Automated checks** must pass
2. **At least one reviewer** approval required
3. **Reviewer checks**:
   - Code quality and standards
   - Test coverage
   - Documentation updates
   - Security considerations

## 🐛 Bug Reports

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with latest version**
3. **Check troubleshooting guide** in README.md

### Bug Report Template

```markdown
## Bug Description
Clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots.

## Environment
- OS: [e.g., Windows 10, macOS 12.0, Ubuntu 20.04]
- Browser: [e.g., Chrome 95, Firefox 93]
- Node.js version: [e.g., 18.17.0]
- Python version: [e.g., 3.11.4]

## Additional Context
Any other context about the problem.
```

## ✨ Feature Requests

### Feature Request Template

```markdown
## Feature Description
Clear and concise description of the feature.

## Problem Statement
What problem does this solve?

## Proposed Solution
Describe your proposed solution.

## Alternatives Considered
Other solutions you've considered.

## Additional Context
Screenshots, mockups, or examples.
```

## 🏷️ Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. **Update version** numbers
2. **Update CHANGELOG.md**
3. **Create release** branch
4. **Test release** candidate
5. **Create GitHub release**
6. **Deploy** to staging/production

## 🆘 Getting Help

### Resources

- **Documentation**: `/docs` directory
- **API Docs**: http://localhost:8000/docs (when running)
- **Architecture**: `/docs/architecture/`

### Communication

- **Issues**: Use GitHub issues for bugs and features
- **Discussions**: Use GitHub discussions for questions
- **Security**: Email security@company.com for security issues

### Community Guidelines

- **Be respectful** and inclusive
- **Provide context** in questions
- **Search before** asking
- **Help others** when you can

## 📄 License

By contributing to ClientOps, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ClientOps! Your efforts help make this project better for everyone.