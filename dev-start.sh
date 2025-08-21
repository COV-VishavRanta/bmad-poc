#!/bin/bash

# ClientOps Development Environment Startup Script
# This script sets up and starts the complete development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed or not in PATH"
        return 1
    fi
}

# Check prerequisites
log_info "Checking prerequisites..."

check_command "node" || exit 1
check_command "npm" || exit 1
check_command "python" || exit 1
check_command "pip" || exit 1
check_command "docker" || exit 1
check_command "docker-compose" || exit 1

log_success "All prerequisites are available"

# Parse command line arguments
SKIP_INSTALL=false
SKIP_BUILD=false
USE_DOCKER=false
FRONTEND_ONLY=false
BACKEND_ONLY=false
RESET_DB=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --docker)
            USE_DOCKER=true
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        --reset-db)
            RESET_DB=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-install    Skip dependency installation"
            echo "  --skip-build      Skip build processes"
            echo "  --docker          Use Docker for services"
            echo "  --frontend-only   Start only frontend"
            echo "  --backend-only    Start only backend"
            echo "  --reset-db        Reset database before starting"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if .env files exist
if [ ! -f ".env" ] && [ ! -f "backend/.env" ]; then
    log_warning "No .env file found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_info "Created .env from .env.example. Please review and update as needed."
    else
        log_error ".env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Install dependencies
if [ "$SKIP_INSTALL" = false ]; then
    if [ "$BACKEND_ONLY" = false ]; then
        log_info "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        log_success "Frontend dependencies installed"
    fi

    if [ "$FRONTEND_ONLY" = false ]; then
        log_info "Installing backend dependencies..."
        cd backend
        make install-dev
        cd ..
        log_success "Backend dependencies installed"
    fi
fi

# Start services
if [ "$USE_DOCKER" = true ]; then
    log_info "Starting services with Docker..."
    
    if [ "$RESET_DB" = true ]; then
        log_info "Resetting database..."
        docker-compose down -v
    fi
    
    docker-compose up -d mysql
    
    # Wait for MySQL to be ready
    log_info "Waiting for MySQL to be ready..."
    sleep 10
    
    # Run migrations
    log_info "Running database migrations..."
    docker-compose run --rm backend alembic upgrade head
    
    # Seed database
    log_info "Seeding database..."
    docker-compose run --rm backend python -m app.seed_data
    
    # Start all services
    docker-compose up
    
else
    # Start services locally
    log_info "Starting services locally..."
    
    # Start database with Docker (if not already running)
    if ! docker ps | grep -q mysql; then
        log_info "Starting MySQL with Docker..."
        docker-compose up -d mysql
        sleep 10
    fi
    
    # Handle database reset
    if [ "$RESET_DB" = true ] && [ "$FRONTEND_ONLY" = false ]; then
        log_info "Resetting database..."
        cd backend
        make migrate-reset
        make seed
        cd ..
    fi
    
    # Run migrations and seed if not reset
    if [ "$RESET_DB" = false ] && [ "$FRONTEND_ONLY" = false ]; then
        log_info "Running database migrations..."
        cd backend
        make migrate
        make seed
        cd ..
    fi
    
    # Create log directory for local development
    mkdir -p logs
    
    # Start backend
    if [ "$FRONTEND_ONLY" = false ]; then
        log_info "Starting backend server..."
        cd backend
        nohup make dev > ../logs/backend.log 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > ../logs/backend.pid
        cd ..
        log_success "Backend started (PID: $BACKEND_PID)"
    fi
    
    # Wait a moment for backend to start
    if [ "$FRONTEND_ONLY" = false ]; then
        sleep 3
        
        # Check if backend is responding
        if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
            log_success "Backend health check passed"
        else
            log_warning "Backend health check failed - it may still be starting up"
        fi
    fi
    
    # Start frontend
    if [ "$BACKEND_ONLY" = false ]; then
        log_info "Starting frontend server..."
        cd frontend
        nohup npm run dev > ../logs/frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > ../logs/frontend.pid
        cd ..
        log_success "Frontend started (PID: $FRONTEND_PID)"
    fi
    
    # Wait a moment for frontend to start
    if [ "$BACKEND_ONLY" = false ]; then
        sleep 5
        
        # Check if frontend is responding
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            log_success "Frontend health check passed"
        else
            log_warning "Frontend health check failed - it may still be starting up"
        fi
    fi
fi

log_success "Development environment is ready!"
echo ""
echo "Services:"
if [ "$BACKEND_ONLY" = false ]; then
    echo "  Frontend: http://localhost:3000"
fi
if [ "$FRONTEND_ONLY" = false ]; then
    echo "  Backend API: http://localhost:8000"
    echo "  API Docs: http://localhost:8000/docs"
fi
echo "  Database: localhost:3306"
echo ""

if [ "$USE_DOCKER" = false ]; then
    echo "Logs:"
    if [ "$BACKEND_ONLY" = false ]; then
        echo "  Frontend: tail -f logs/frontend.log"
    fi
    if [ "$FRONTEND_ONLY" = false ]; then
        echo "  Backend: tail -f logs/backend.log"
    fi
    echo ""
    echo "To stop services:"
    if [ -f "logs/frontend.pid" ]; then
        echo "  Frontend: kill \$(cat logs/frontend.pid)"
    fi
    if [ -f "logs/backend.pid" ]; then
        echo "  Backend: kill \$(cat logs/backend.pid)"
    fi
    echo "  Database: docker-compose stop mysql"
fi

echo ""
log_info "Happy coding! 🚀"