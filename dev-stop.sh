#!/bin/bash

# ClientOps Development Environment Stop Script
# This script gracefully stops all development services

set -e

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

# Parse command line arguments
STOP_DOCKER=false
CLEAN_LOGS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --docker)
            STOP_DOCKER=true
            shift
            ;;
        --clean-logs)
            CLEAN_LOGS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --docker      Stop Docker services"
            echo "  --clean-logs  Clean log files"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

log_info "Stopping ClientOps Development Environment..."

# Stop local processes
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        log_info "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm logs/frontend.pid
        log_success "Frontend server stopped"
    else
        log_warning "Frontend server not running (PID: $FRONTEND_PID)"
        rm logs/frontend.pid
    fi
fi

if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        log_info "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm logs/backend.pid
        log_success "Backend server stopped"
    else
        log_warning "Backend server not running (PID: $BACKEND_PID)"
        rm logs/backend.pid
    fi
fi

# Stop any remaining Node.js processes (Next.js dev server)
NEXTJS_PIDS=$(pgrep -f "next-server" 2>/dev/null || true)
if [ ! -z "$NEXTJS_PIDS" ]; then
    log_info "Stopping remaining Next.js processes..."
    echo $NEXTJS_PIDS | xargs kill 2>/dev/null || true
    log_success "Next.js processes stopped"
fi

# Stop any remaining Python processes (uvicorn)
UVICORN_PIDS=$(pgrep -f "uvicorn.*app.main:app" 2>/dev/null || true)
if [ ! -z "$UVICORN_PIDS" ]; then
    log_info "Stopping remaining uvicorn processes..."
    echo $UVICORN_PIDS | xargs kill 2>/dev/null || true
    log_success "Uvicorn processes stopped"
fi

# Stop Docker services if requested
if [ "$STOP_DOCKER" = true ]; then
    log_info "Stopping Docker services..."
    docker-compose stop
    log_success "Docker services stopped"
fi

# Clean log files if requested
if [ "$CLEAN_LOGS" = true ]; then
    log_info "Cleaning log files..."
    rm -f logs/*.log
    rm -f logs/*.pid
    log_success "Log files cleaned"
fi

log_success "Development environment stopped successfully!"

# Show remaining processes
log_info "Checking for any remaining processes..."

REMAINING_NODE=$(pgrep -f "node.*next" 2>/dev/null || true)
REMAINING_PYTHON=$(pgrep -f "python.*uvicorn" 2>/dev/null || true)

if [ ! -z "$REMAINING_NODE" ] || [ ! -z "$REMAINING_PYTHON" ]; then
    log_warning "Some processes may still be running:"
    if [ ! -z "$REMAINING_NODE" ]; then
        echo "  Node.js processes: $REMAINING_NODE"
    fi
    if [ ! -z "$REMAINING_PYTHON" ]; then
        echo "  Python processes: $REMAINING_PYTHON"
    fi
    echo ""
    echo "To force kill all:"
    echo "  pkill -f 'node.*next'"
    echo "  pkill -f 'python.*uvicorn'"
else
    log_success "No remaining development processes found"
fi

echo ""
log_info "To stop the database: docker-compose stop mysql"
log_info "To clean everything: docker-compose down -v"