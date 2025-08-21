# ClientOps - Project Management System

## Overview
ClientOps is a comprehensive project management system designed for efficient client and project management. Built with modern web technologies, it provides a robust platform for managing clients, projects, teams, and deliverables.

## 🚀 Tech Stack

### Frontend
- **Next.js 15** with Turbopack for fast development
- **React 19** with modern hooks and concurrent features
- **TypeScript 5.9** for type safety
- **Material-UI v5** for consistent UI components
- **Tailwind CSS v4** for utility-first styling
- **ESLint 9** and **Prettier** for code quality

### Backend
- **FastAPI** with Python 3.11+ for high-performance APIs
- **SQLAlchemy 2.0** with async support
- **MySQL 8.0** as the primary database
- **Alembic** for database migrations
- **Pydantic v2** for data validation

### Development Tools
- **Docker & Docker Compose** for containerization
- **Husky** for git hooks
- **Black, Flake8, isort, mypy** for Python code quality
- **Comprehensive testing** with pytest and Jest

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Python** (v3.11 or higher)
- **Docker & Docker Compose**
- **Git**

## 🛠️ Development Setup

### Quick Start with Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd bmad-poc
   ```

2. **Start the development environment:**
   ```bash
   # Linux/Mac
   ./dev-start.sh
   
   # Windows
   dev-start.bat
   ```

   This script will:
   - Start all services (database, backend, frontend)
   - Install dependencies
   - Run database migrations
   - Seed initial data
   - Check health status

3. **Access the applications:**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs
   - **Database**: localhost:3306

### Manual Setup

#### 1. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# DATABASE_URL=mysql+pymysql://clientops_user:secure_password@localhost:3306/clientops_db
# ENVIRONMENT=development
```

#### 2. Database Setup

```bash
# Start MySQL with Docker
docker-compose up mysql -d

# Run database migrations
cd backend
make migrate

# Seed initial data
make seed
```

#### 3. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start development server
make dev
```

#### 4. Frontend Setup

```bash
cd frontend

# Install Node.js dependencies
npm install

# Start development server
npm run dev
```

## 🔧 Development Scripts

### Unified Development Commands

```bash
# Start all services
./dev-start.sh            # Linux/Mac
dev-start.bat              # Windows

# Stop all services
./dev-stop.sh              # Linux/Mac

# Health check
./dev-health.sh            # Linux/Mac
dev-health.bat             # Windows

# Database management
./db-manage.sh status      # Check migration status
./db-manage.sh migrate     # Apply migrations
./db-manage.sh seed        # Seed data
./db-manage.sh reset       # Reset database

# Testing automation
./test-automation.sh all   # Run all tests
./test-automation.sh ci    # CI pipeline
```

### Frontend Commands

```bash
cd frontend

# Development
npm run dev              # Start development server
npm run dev:fast         # Optimized development mode
npm run dev:debug        # Debug mode

# Building
npm run build            # Production build
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run type-check       # TypeScript checking

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Health & Utilities
npm run health           # Check frontend health
npm run check-all        # All quality checks
npm run fix-all          # Fix all issues
```

### Backend Commands

```bash
cd backend

# Development
make dev                 # Start development server
make dev-debug           # Debug mode
make dev-fast            # Optimized hot reload

# Code Quality
make lint                # Run all linters
make format              # Format code
make type-check          # mypy type checking

# Testing
make test                # Run tests
make test-watch          # Watch mode
make test-cov            # Coverage report

# Database
make migrate             # Apply migrations
make migrate-create      # Create new migration
make seed                # Seed data
make db-reset            # Reset database

# Health & Utilities
make health              # Check backend health
make logs                # View logs
make clean               # Clean cache
```

## 🐳 Docker Development

### Services

The development environment includes three main services:

1. **MySQL Database** (port 3306)
2. **FastAPI Backend** (port 8000) 
3. **Next.js Frontend** (port 3000)

### Docker Commands

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Start specific service
docker-compose -f docker-compose.dev.yml up frontend

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Rebuild services
docker-compose -f docker-compose.dev.yml up --build

# Stop services
docker-compose -f docker-compose.dev.yml down

# Clean up volumes
docker-compose -f docker-compose.dev.yml down -v
```

### Hot Reload Configuration

The Docker setup includes optimized volume mounts for hot reload:

- **Frontend**: Source code, configuration files mounted with `:cached`
- **Backend**: Application code, excluding `__pycache__`
- **Optimized**: Excludes `node_modules`, `.next`, cache directories

## 🗄️ Database

### Schema

The database includes the following main entities:

- **Users**: User authentication and profiles
- **Clients**: Client information and contacts
- **Projects**: Project details and status
- **SOWs**: Statements of Work
- **Teams**: Team management and assignments
- **Assignments**: User-project relationships

### Migrations

```bash
# Check current status
./db-manage.sh status

# Apply pending migrations
./db-manage.sh upgrade

# Create new migration
./db-manage.sh create "Description of changes"

# Rollback migration
./db-manage.sh downgrade

# Reset database
./db-manage.sh fresh
```

### Backup & Restore

```bash
# Create backup
./db-manage.sh backup production-backup

# Restore backup
./db-manage.sh restore production-backup

# List backups
ls backups/
```

## 🧪 Testing

### Running Tests

```bash
# All tests
./test-automation.sh all

# Frontend only
./test-automation.sh frontend

# Backend only
./test-automation.sh backend

# Quality checks
./test-automation.sh quality

# CI pipeline
./test-automation.sh ci
```

### Test Coverage

- **Minimum Coverage**: 80%
- **Reports**: HTML and terminal output
- **Location**: `coverage/` directory

## 📊 Code Quality

### Automated Checks

- **ESLint**: Frontend linting with TypeScript rules
- **Prettier**: Code formatting
- **Black**: Python code formatting
- **Flake8**: Python linting
- **isort**: Import organization  
- **mypy**: Static type checking
- **Husky**: Pre-commit hooks

### Pre-commit Hooks

```bash
# Install hooks
npm run prepare

# Manual run
npx husky run .husky/pre-commit
```

### Quality Standards

- **Line Length**: 88 characters (Python), 100 characters (TypeScript)
- **Import Order**: PEP8 compliant with isort
- **Type Coverage**: 100% for new code
- **Documentation**: Required for public APIs

## 🔍 Monitoring & Health

### Health Checks

```bash
# Quick health check
./dev-health.sh

# Detailed monitoring
./dev-health.sh --detailed

# Continuous monitoring  
./dev-health.sh --continuous
```

### Available Endpoints

- **Frontend**: http://localhost:3000
- **Backend Health**: http://localhost:8000/api/health
- **Database Health**: http://localhost:8000/api/health/database
- **API Documentation**: http://localhost:8000/docs

### Logs

```bash
# Backend logs
cd backend && make logs

# Frontend logs (development)
cd frontend && npm run dev

# Docker logs
docker-compose -f docker-compose.dev.yml logs -f
```

## 🚀 Deployment

### Production Build

```bash
# Frontend production build
cd frontend
npm run build

# Backend production setup
cd backend
ENVIRONMENT=production make prod
```

### Environment Variables

Required environment variables for production:

```bash
# Database
DATABASE_URL=mysql+pymysql://user:password@host:port/database

# Application
ENVIRONMENT=production
SECRET_KEY=your-secret-key
CORS_ORIGINS=https://yourdomain.com

# Optional
LOG_LEVEL=warning
SENTRY_DSN=your-sentry-dsn
```

## 🤝 Contributing

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding standards
   - Add tests for new features
   - Update documentation

3. **Quality Checks**
   ```bash
   ./test-automation.sh quality
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Coding Standards

- **Python**: Follow PEP8, use type hints
- **TypeScript**: Strict mode, explicit types
- **React**: Functional components, hooks
- **Git**: Conventional commits format

### Code Review Process

1. All PRs require review
2. All tests must pass
3. Code coverage must meet standards
4. Documentation must be updated

## 🛠️ Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check what's using port 3000
lsof -i :3000                    # Mac/Linux
netstat -ano | findstr :3000     # Windows

# Kill process
kill -9 <PID>                    # Mac/Linux
taskkill /PID <PID> /F           # Windows
```

#### Database Connection Issues

```bash
# Check MySQL status
docker-compose -f docker-compose.dev.yml ps mysql

# View MySQL logs
docker-compose -f docker-compose.dev.yml logs mysql

# Reset database
./db-manage.sh fresh --force
```

#### Node.js Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### Python Environment Issues

```bash
# Recreate virtual environment
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

#### Docker Issues

```bash
# Clean Docker cache
docker system prune -f

# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache

# Reset volumes
docker-compose -f docker-compose.dev.yml down -v
docker volume prune -f
```

### Getting Help

1. **Check Logs**: Use health check scripts and log commands
2. **Review Documentation**: Check `/docs` directory
3. **Search Issues**: Look for similar problems in the repository
4. **Create Issue**: Provide detailed error information and steps to reproduce

## 📚 Documentation

- **Architecture**: `/docs/architecture/`
- **API Documentation**: http://localhost:8000/docs (when running)
- **User Stories**: `/docs/stories/`
- **Development Guide**: This README

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- **Repository**: [GitHub Repository URL]
- **Live Demo**: [Demo URL if available]
- **Documentation**: [Documentation URL if available]
- **Issue Tracker**: [Issues URL]

---

**Need Help?** Check the troubleshooting section above or create an issue in the repository.