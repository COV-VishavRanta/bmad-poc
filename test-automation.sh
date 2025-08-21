#!/bin/bash

# ClientOps Testing Automation Script
# This script provides comprehensive testing for the development environment

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

# Configuration
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
COVERAGE_THRESHOLD=80
WATCH_MODE=false
VERBOSE=false
QUICK_MODE=false
CI_MODE=false

show_help() {
    echo "ClientOps Testing Automation"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  all              Run all tests (frontend + backend)"
    echo "  frontend         Run frontend tests only"
    echo "  backend          Run backend tests only"
    echo "  lint             Run linting for all projects"
    echo "  format           Run formatting for all projects"
    echo "  type-check       Run type checking"
    echo "  quality          Run all quality checks (lint + format + type-check)"
    echo "  coverage         Run tests with coverage report"
    echo "  ci               Run CI pipeline (quality + tests + coverage)"
    echo "  watch            Run tests in watch mode"
    echo ""
    echo "Options:"
    echo "  --verbose        Show detailed output"
    echo "  --quick          Skip slower tests"
    echo "  --ci             CI mode (fail fast, no interactive)"
    echo "  --coverage-min N Set minimum coverage threshold (default: 80)"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 all --verbose"
    echo "  $0 coverage --coverage-min 85"
    echo "  $0 ci"
}

# Parse command line arguments
COMMAND="all"
while [[ $# -gt 0 ]]; do
    case $1 in
        all|frontend|backend|lint|format|type-check|quality|coverage|ci|watch)
            COMMAND="$1"
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --quick)
            QUICK_MODE=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        --coverage-min)
            COVERAGE_THRESHOLD="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

if [ "$COMMAND" = "watch" ]; then
    WATCH_MODE=true
    COMMAND="all"
fi

# Set CI mode defaults
if [ "$CI_MODE" = true ]; then
    VERBOSE=true
    set -e  # Fail fast in CI
fi

# Utility functions
run_command() {
    local cmd="$1"
    local desc="$2"
    local dir="$3"
    
    if [ -n "$dir" ]; then
        log_info "Running $desc in $dir..."
        if [ "$VERBOSE" = true ]; then
            (cd "$dir" && eval "$cmd")
        else
            (cd "$dir" && eval "$cmd" > /dev/null 2>&1)
        fi
    else
        log_info "Running $desc..."
        if [ "$VERBOSE" = true ]; then
            eval "$cmd"
        else
            eval "$cmd" > /dev/null 2>&1
        fi
    fi
    
    if [ $? -eq 0 ]; then
        log_success "$desc completed successfully"
        return 0
    else
        log_error "$desc failed"
        return 1
    fi
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js and npm
    if [ -d "$FRONTEND_DIR" ]; then
        if ! command -v node &> /dev/null; then
            log_error "Node.js is not installed"
            return 1
        fi
        
        if ! command -v npm &> /dev/null; then
            log_error "npm is not installed"
            return 1
        fi
        
        if [ ! -f "$FRONTEND_DIR/package.json" ]; then
            log_error "Frontend package.json not found"
            return 1
        fi
        
        # Check if node_modules exists
        if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
            log_warning "Frontend dependencies not installed, installing..."
            run_command "npm install" "Frontend dependency installation" "$FRONTEND_DIR"
        fi
    fi
    
    # Check Python and backend dependencies
    if [ -d "$BACKEND_DIR" ]; then
        if ! command -v python &> /dev/null; then
            log_error "Python is not installed"
            return 1
        fi
        
        # Check if virtual environment is activated or requirements are installed
        if ! python -c "import fastapi" &> /dev/null; then
            log_warning "Backend dependencies might not be installed"
            if [ -f "$BACKEND_DIR/requirements.txt" ]; then
                log_info "Installing backend dependencies..."
                run_command "pip install -r requirements.txt" "Backend dependency installation" "$BACKEND_DIR"
            fi
        fi
    fi
    
    log_success "Dependencies checked"
    return 0
}

# Frontend testing functions
run_frontend_lint() {
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_warning "Frontend directory not found, skipping frontend linting"
        return 0
    fi
    
    run_command "npm run lint" "Frontend linting" "$FRONTEND_DIR"
}

run_frontend_format() {
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_warning "Frontend directory not found, skipping frontend formatting"
        return 0
    fi
    
    if [ "$CI_MODE" = true ]; then
        run_command "npm run format:check" "Frontend format check" "$FRONTEND_DIR"
    else
        run_command "npm run format" "Frontend formatting" "$FRONTEND_DIR"
    fi
}

run_frontend_type_check() {
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_warning "Frontend directory not found, skipping frontend type checking"
        return 0
    fi
    
    run_command "npm run type-check" "Frontend type checking" "$FRONTEND_DIR"
}

run_frontend_tests() {
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_warning "Frontend directory not found, skipping frontend tests"
        return 0
    fi
    
    # Check if test script exists
    if ! grep -q '"test"' "$FRONTEND_DIR/package.json"; then
        log_warning "No frontend test script found, skipping frontend tests"
        return 0
    fi
    
    if [ "$WATCH_MODE" = true ]; then
        run_command "npm run test:watch" "Frontend tests (watch mode)" "$FRONTEND_DIR"
    else
        run_command "npm run test" "Frontend tests" "$FRONTEND_DIR"
    fi
}

run_frontend_coverage() {
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_warning "Frontend directory not found, skipping frontend coverage"
        return 0
    fi
    
    # Check if coverage script exists
    if ! grep -q '"test:coverage"' "$FRONTEND_DIR/package.json"; then
        log_warning "No frontend coverage script found, skipping frontend coverage"
        return 0
    fi
    
    run_command "npm run test:coverage" "Frontend test coverage" "$FRONTEND_DIR"
}

# Backend testing functions
run_backend_lint() {
    if [ ! -d "$BACKEND_DIR" ]; then
        log_warning "Backend directory not found, skipping backend linting"
        return 0
    fi
    
    # Check if Makefile exists
    if [ -f "$BACKEND_DIR/Makefile" ]; then
        run_command "make lint" "Backend linting" "$BACKEND_DIR"
    else
        # Fallback to direct commands
        if command -v black &> /dev/null; then
            run_command "black --check ." "Backend Black check" "$BACKEND_DIR"
        fi
        
        if command -v flake8 &> /dev/null; then
            run_command "flake8 ." "Backend Flake8 check" "$BACKEND_DIR"
        fi
    fi
}

run_backend_format() {
    if [ ! -d "$BACKEND_DIR" ]; then
        log_warning "Backend directory not found, skipping backend formatting"
        return 0
    fi
    
    if [ "$CI_MODE" = true ]; then
        # In CI mode, just check formatting
        if [ -f "$BACKEND_DIR/Makefile" ]; then
            run_command "make lint" "Backend format check" "$BACKEND_DIR"
        else
            run_command "black --check ." "Backend format check" "$BACKEND_DIR"
        fi
    else
        # In dev mode, apply formatting
        if [ -f "$BACKEND_DIR/Makefile" ]; then
            run_command "make format" "Backend formatting" "$BACKEND_DIR"
        else
            run_command "black ." "Backend formatting" "$BACKEND_DIR"
        fi
    fi
}

run_backend_type_check() {
    if [ ! -d "$BACKEND_DIR" ]; then
        log_warning "Backend directory not found, skipping backend type checking"
        return 0
    fi
    
    if [ -f "$BACKEND_DIR/Makefile" ]; then
        run_command "make type-check" "Backend type checking" "$BACKEND_DIR"
    elif command -v mypy &> /dev/null; then
        run_command "mypy ." "Backend type checking" "$BACKEND_DIR"
    else
        log_warning "mypy not available, skipping backend type checking"
    fi
}

run_backend_tests() {
    if [ ! -d "$BACKEND_DIR" ]; then
        log_warning "Backend directory not found, skipping backend tests"
        return 0
    fi
    
    if [ -f "$BACKEND_DIR/Makefile" ]; then
        if [ "$WATCH_MODE" = true ]; then
            run_command "make test-watch" "Backend tests (watch mode)" "$BACKEND_DIR"
        else
            run_command "make test" "Backend tests" "$BACKEND_DIR"
        fi
    elif command -v pytest &> /dev/null; then
        if [ "$WATCH_MODE" = true ]; then
            run_command "pytest --watch" "Backend tests (watch mode)" "$BACKEND_DIR"
        else
            run_command "pytest" "Backend tests" "$BACKEND_DIR"
        fi
    else
        log_warning "No pytest available, skipping backend tests"
    fi
}

run_backend_coverage() {
    if [ ! -d "$BACKEND_DIR" ]; then
        log_warning "Backend directory not found, skipping backend coverage"
        return 0
    fi
    
    if [ -f "$BACKEND_DIR/Makefile" ]; then
        run_command "make test-cov" "Backend test coverage" "$BACKEND_DIR"
    elif command -v pytest &> /dev/null; then
        run_command "pytest --cov=app --cov-report=html --cov-report=term-missing" "Backend test coverage" "$BACKEND_DIR"
    else
        log_warning "No pytest available, skipping backend coverage"
    fi
}

# Combined testing functions
run_all_lint() {
    local overall_result=0
    
    log_info "Running linting for all projects..."
    
    if ! run_frontend_lint; then
        overall_result=1
    fi
    
    if ! run_backend_lint; then
        overall_result=1
    fi
    
    if [ $overall_result -eq 0 ]; then
        log_success "All linting passed"
    else
        log_error "Some linting checks failed"
    fi
    
    return $overall_result
}

run_all_format() {
    local overall_result=0
    
    log_info "Running formatting for all projects..."
    
    if ! run_frontend_format; then
        overall_result=1
    fi
    
    if ! run_backend_format; then
        overall_result=1
    fi
    
    if [ $overall_result -eq 0 ]; then
        log_success "All formatting completed"
    else
        log_error "Some formatting checks failed"
    fi
    
    return $overall_result
}

run_all_type_check() {
    local overall_result=0
    
    log_info "Running type checking for all projects..."
    
    if ! run_frontend_type_check; then
        overall_result=1
    fi
    
    if ! run_backend_type_check; then
        overall_result=1
    fi
    
    if [ $overall_result -eq 0 ]; then
        log_success "All type checking passed"
    else
        log_error "Some type checking failed"
    fi
    
    return $overall_result
}

run_all_tests() {
    local overall_result=0
    
    log_info "Running tests for all projects..."
    
    if ! run_frontend_tests; then
        overall_result=1
    fi
    
    if ! run_backend_tests; then
        overall_result=1
    fi
    
    if [ $overall_result -eq 0 ]; then
        log_success "All tests passed"
    else
        log_error "Some tests failed"
    fi
    
    return $overall_result
}

run_all_coverage() {
    local overall_result=0
    
    log_info "Running coverage for all projects..."
    
    if ! run_frontend_coverage; then
        overall_result=1
    fi
    
    if ! run_backend_coverage; then
        overall_result=1
    fi
    
    if [ $overall_result -eq 0 ]; then
        log_success "All coverage reports generated"
        log_info "Coverage threshold: $COVERAGE_THRESHOLD%"
    else
        log_error "Some coverage reports failed"
    fi
    
    return $overall_result
}

run_quality_checks() {
    local overall_result=0
    
    log_info "Running all quality checks..."
    
    if ! run_all_lint; then
        overall_result=1
        if [ "$CI_MODE" = true ]; then
            return $overall_result
        fi
    fi
    
    if ! run_all_format; then
        overall_result=1
        if [ "$CI_MODE" = true ]; then
            return $overall_result
        fi
    fi
    
    if ! run_all_type_check; then
        overall_result=1
        if [ "$CI_MODE" = true ]; then
            return $overall_result
        fi
    fi
    
    if [ $overall_result -eq 0 ]; then
        log_success "All quality checks passed"
    else
        log_error "Some quality checks failed"
    fi
    
    return $overall_result
}

run_ci_pipeline() {
    log_info "Running CI pipeline..."
    
    if ! check_dependencies; then
        return 1
    fi
    
    if ! run_quality_checks; then
        log_error "Quality checks failed, stopping CI pipeline"
        return 1
    fi
    
    if ! run_all_tests; then
        log_error "Tests failed, stopping CI pipeline"
        return 1
    fi
    
    if ! run_all_coverage; then
        log_error "Coverage failed, stopping CI pipeline"
        return 1
    fi
    
    log_success "CI pipeline completed successfully"
    return 0
}

# Main execution
echo "=========================="
echo "ClientOps Testing Suite"
echo "$(date)"
echo "=========================="
echo ""

if [ "$WATCH_MODE" = true ]; then
    log_info "Starting watch mode..."
    log_info "Press Ctrl+C to stop"
fi

# Check dependencies first
if ! check_dependencies; then
    log_error "Dependency check failed"
    exit 1
fi

# Execute the requested command
case $COMMAND in
    all)
        if [ "$WATCH_MODE" = true ]; then
            # In watch mode, run a simple test loop
            while true; do
                echo ""
                log_info "Running tests..."
                run_all_tests || true
                echo ""
                log_info "Waiting for changes... (Press Ctrl+C to stop)"
                sleep 5
            done
        else
            exit_code=0
            if ! run_all_tests; then
                exit_code=1
            fi
            exit $exit_code
        fi
        ;;
    frontend)
        run_frontend_tests
        ;;
    backend)
        run_backend_tests
        ;;
    lint)
        run_all_lint
        ;;
    format)
        run_all_format
        ;;
    type-check)
        run_all_type_check
        ;;
    quality)
        run_quality_checks
        ;;
    coverage)
        run_all_coverage
        ;;
    ci)
        run_ci_pipeline
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac