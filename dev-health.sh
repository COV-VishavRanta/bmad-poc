#!/bin/bash

# ClientOps Development Environment Health Check Script
# This script checks the health of all development services

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
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-5}
    
    if curl -f --max-time $timeout "$url" > /dev/null 2>&1; then
        log_success "$service_name is healthy"
        return 0
    else
        log_error "$service_name is not responding"
        return 1
    fi
}

check_port() {
    local service_name=$1
    local host=$2
    local port=$3
    
    if nc -z -w5 "$host" "$port" > /dev/null 2>&1; then
        log_success "$service_name port $port is open"
        return 0
    else
        log_error "$service_name port $port is not accessible"
        return 1
    fi
}

# Parse command line arguments
DETAILED=false
CONTINUOUS=false
INTERVAL=30

while [[ $# -gt 0 ]]; do
    case $1 in
        --detailed)
            DETAILED=true
            shift
            ;;
        --continuous)
            CONTINUOUS=true
            shift
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --detailed    Show detailed health information"
            echo "  --continuous  Run health checks continuously"
            echo "  --interval N  Set interval for continuous checks (default: 30s)"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

health_check() {
    echo "=========================="
    echo "ClientOps Health Check"
    echo "$(date)"
    echo "=========================="
    echo ""
    
    local overall_health=0
    
    # Check prerequisite tools
    log_info "Checking prerequisites..."
    
    if command -v node &> /dev/null; then
        log_success "Node.js is available ($(node --version))"
    else
        log_error "Node.js is not installed"
        overall_health=1
    fi
    
    if command -v npm &> /dev/null; then
        log_success "npm is available ($(npm --version))"
    else
        log_error "npm is not installed"
        overall_health=1
    fi
    
    if command -v python &> /dev/null; then
        log_success "Python is available ($(python --version 2>&1))"
    else
        log_error "Python is not installed"
        overall_health=1
    fi
    
    if command -v docker &> /dev/null; then
        log_success "Docker is available ($(docker --version | cut -d' ' -f3 | cut -d',' -f1))"
    else
        log_error "Docker is not installed"
        overall_health=1
    fi
    
    echo ""
    
    # Check database
    log_info "Checking database..."
    
    if check_port "MySQL" "localhost" "3306"; then
        if [ "$DETAILED" = true ]; then
            # Try to get MySQL version
            mysql_version=$(docker exec $(docker ps -q -f "name=mysql") mysql --version 2>/dev/null | cut -d' ' -f6 | cut -d',' -f1 || echo "unknown")
            log_info "MySQL version: $mysql_version"
        fi
    else
        overall_health=1
    fi
    
    echo ""
    
    # Check backend
    log_info "Checking backend services..."
    
    if check_service "Backend API" "http://localhost:8000/api/health"; then
        if [ "$DETAILED" = true ]; then
            # Get detailed backend health
            backend_health=$(curl -s "http://localhost:8000/api/health" | python -m json.tool 2>/dev/null || echo "Could not parse response")
            echo "  Backend details: $backend_health"
            
            # Check database connectivity through backend
            if check_service "Backend Database Connection" "http://localhost:8000/api/health/database"; then
                db_health=$(curl -s "http://localhost:8000/api/health/database" | python -m json.tool 2>/dev/null || echo "Could not parse response")
                echo "  Database connectivity: OK"
            else
                overall_health=1
            fi
        fi
    else
        overall_health=1
    fi
    
    echo ""
    
    # Check frontend
    log_info "Checking frontend services..."
    
    if check_service "Frontend" "http://localhost:3000"; then
        if [ "$DETAILED" = true ]; then
            # Check if frontend can reach backend
            frontend_to_backend=$(curl -s "http://localhost:3000" | grep -q "ClientOps" && echo "OK" || echo "Error")
            log_info "Frontend status: $frontend_to_backend"
        fi
    else
        overall_health=1
    fi
    
    echo ""
    
    # Check processes
    log_info "Checking running processes..."
    
    if pgrep -f "uvicorn.*app.main:app" > /dev/null 2>&1; then
        log_success "Backend server process is running"
    else
        log_warning "Backend server process not found"
    fi
    
    if pgrep -f "next-server" > /dev/null 2>&1; then
        log_success "Frontend server process is running"
    else
        log_warning "Frontend server process not found"
    fi
    
    echo ""
    
    # Check log files
    if [ "$DETAILED" = true ]; then
        log_info "Checking log files..."
        
        if [ -f "logs/backend.log" ]; then
            backend_log_lines=$(wc -l < logs/backend.log)
            log_info "Backend log: $backend_log_lines lines"
            
            # Check for recent errors
            recent_errors=$(tail -100 logs/backend.log | grep -i error | wc -l)
            if [ $recent_errors -gt 0 ]; then
                log_warning "Found $recent_errors recent errors in backend log"
            fi
        else
            log_warning "Backend log file not found"
        fi
        
        if [ -f "logs/frontend.log" ]; then
            frontend_log_lines=$(wc -l < logs/frontend.log)
            log_info "Frontend log: $frontend_log_lines lines"
            
            # Check for recent errors
            recent_errors=$(tail -100 logs/frontend.log | grep -i error | wc -l)
            if [ $recent_errors -gt 0 ]; then
                log_warning "Found $recent_errors recent errors in frontend log"
            fi
        else
            log_warning "Frontend log file not found"
        fi
        
        echo ""
    fi
    
    # Overall status
    if [ $overall_health -eq 0 ]; then
        log_success "All services are healthy! 🎉"
    else
        log_error "Some services are not healthy. Check the details above."
    fi
    
    echo ""
    echo "Services URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo "  API Documentation: http://localhost:8000/docs"
    echo "  Database: localhost:3306"
    
    return $overall_health
}

# Run health check
if [ "$CONTINUOUS" = true ]; then
    log_info "Starting continuous health monitoring (interval: ${INTERVAL}s)"
    log_info "Press Ctrl+C to stop"
    echo ""
    
    while true; do
        health_check
        echo ""
        log_info "Waiting ${INTERVAL} seconds..."
        sleep $INTERVAL
        clear
    done
else
    health_check
fi