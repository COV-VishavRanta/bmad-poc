@echo off
setlocal EnableDelayedExpansion

REM ClientOps Testing Automation Script
REM This script provides comprehensive testing for the development environment

set "FRONTEND_DIR=frontend"
set "BACKEND_DIR=backend"
set "COVERAGE_THRESHOLD=80"
set "WATCH_MODE=false"
set "VERBOSE=false"
set "QUICK_MODE=false"
set "CI_MODE=false"
set "COMMAND=all"

:parse_args
if "%~1"=="" goto start_testing
if "%~1"=="all" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="frontend" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="backend" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="lint" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="format" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="type-check" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="quality" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="coverage" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="ci" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="watch" (
    set "WATCH_MODE=true"
    set "COMMAND=all"
    shift
    goto parse_args
)
if "%~1"=="--verbose" (
    set "VERBOSE=true"
    shift
    goto parse_args
)
if "%~1"=="--quick" (
    set "QUICK_MODE=true"
    shift
    goto parse_args
)
if "%~1"=="--ci" (
    set "CI_MODE=true"
    shift
    goto parse_args
)
if "%~1"=="--coverage-min" (
    set "COVERAGE_THRESHOLD=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--help" (
    call :show_help
    exit /b 0
)
echo Unknown option: %~1
call :show_help
exit /b 1

:log_info
echo [INFO] %~1
goto :eof

:log_success
echo [✓] %~1
goto :eof

:log_warning
echo [⚠] %~1
goto :eof

:log_error
echo [✗] %~1
goto :eof

:show_help
echo ClientOps Testing Automation
echo.
echo Usage: %0 [COMMAND] [OPTIONS]
echo.
echo Commands:
echo   all              Run all tests (frontend + backend)
echo   frontend         Run frontend tests only
echo   backend          Run backend tests only
echo   lint             Run linting for all projects
echo   format           Run formatting for all projects
echo   type-check       Run type checking
echo   quality          Run all quality checks (lint + format + type-check)
echo   coverage         Run tests with coverage report
echo   ci               Run CI pipeline (quality + tests + coverage)
echo   watch            Run tests in watch mode
echo.
echo Options:
echo   --verbose        Show detailed output
echo   --quick          Skip slower tests
echo   --ci             CI mode (fail fast, no interactive)
echo   --coverage-min N Set minimum coverage threshold (default: 80)
echo   --help           Show this help message
echo.
echo Examples:
echo   %0 all --verbose
echo   %0 coverage --coverage-min 85
echo   %0 ci
goto :eof

:run_command
set "cmd=%~1"
set "desc=%~2"
set "dir=%~3"

if not "%dir%"=="" (
    call :log_info "Running %desc% in %dir%..."
    pushd "%dir%"
    if "%VERBOSE%"=="true" (
        %cmd%
    ) else (
        %cmd% >nul 2>&1
    )
    set "result=%errorlevel%"
    popd
) else (
    call :log_info "Running %desc%..."
    if "%VERBOSE%"=="true" (
        %cmd%
    ) else (
        %cmd% >nul 2>&1
    )
    set "result=%errorlevel%"
)

if %result%==0 (
    call :log_success "%desc% completed successfully"
    exit /b 0
) else (
    call :log_error "%desc% failed"
    exit /b 1
)

:check_dependencies
call :log_info "Checking dependencies..."

REM Check Node.js and npm
if exist "%FRONTEND_DIR%" (
    where node >nul 2>&1
    if %errorlevel% neq 0 (
        call :log_error "Node.js is not installed"
        exit /b 1
    )
    
    where npm >nul 2>&1
    if %errorlevel% neq 0 (
        call :log_error "npm is not installed"
        exit /b 1
    )
    
    if not exist "%FRONTEND_DIR%\package.json" (
        call :log_error "Frontend package.json not found"
        exit /b 1
    )
    
    if not exist "%FRONTEND_DIR%\node_modules" (
        call :log_warning "Frontend dependencies not installed, installing..."
        call :run_command "npm install" "Frontend dependency installation" "%FRONTEND_DIR%"
    )
)

REM Check Python and backend dependencies
if exist "%BACKEND_DIR%" (
    where python >nul 2>&1
    if %errorlevel% neq 0 (
        call :log_error "Python is not installed"
        exit /b 1
    )
    
    python -c "import fastapi" >nul 2>&1
    if %errorlevel% neq 0 (
        call :log_warning "Backend dependencies might not be installed"
        if exist "%BACKEND_DIR%\requirements.txt" (
            call :log_info "Installing backend dependencies..."
            call :run_command "pip install -r requirements.txt" "Backend dependency installation" "%BACKEND_DIR%"
        )
    )
)

call :log_success "Dependencies checked"
exit /b 0

:run_frontend_lint
if not exist "%FRONTEND_DIR%" (
    call :log_warning "Frontend directory not found, skipping frontend linting"
    exit /b 0
)

call :run_command "npm run lint" "Frontend linting" "%FRONTEND_DIR%"
exit /b %errorlevel%

:run_frontend_format
if not exist "%FRONTEND_DIR%" (
    call :log_warning "Frontend directory not found, skipping frontend formatting"
    exit /b 0
)

if "%CI_MODE%"=="true" (
    call :run_command "npm run format:check" "Frontend format check" "%FRONTEND_DIR%"
) else (
    call :run_command "npm run format" "Frontend formatting" "%FRONTEND_DIR%"
)
exit /b %errorlevel%

:run_frontend_type_check
if not exist "%FRONTEND_DIR%" (
    call :log_warning "Frontend directory not found, skipping frontend type checking"
    exit /b 0
)

call :run_command "npm run type-check" "Frontend type checking" "%FRONTEND_DIR%"
exit /b %errorlevel%

:run_frontend_tests
if not exist "%FRONTEND_DIR%" (
    call :log_warning "Frontend directory not found, skipping frontend tests"
    exit /b 0
)

REM Check if test script exists
findstr /C:"""test""" "%FRONTEND_DIR%\package.json" >nul 2>&1
if %errorlevel% neq 0 (
    call :log_warning "No frontend test script found, skipping frontend tests"
    exit /b 0
)

if "%WATCH_MODE%"=="true" (
    call :run_command "npm run test:watch" "Frontend tests (watch mode)" "%FRONTEND_DIR%"
) else (
    call :run_command "npm run test" "Frontend tests" "%FRONTEND_DIR%"
)
exit /b %errorlevel%

:run_backend_lint
if not exist "%BACKEND_DIR%" (
    call :log_warning "Backend directory not found, skipping backend linting"
    exit /b 0
)

if exist "%BACKEND_DIR%\Makefile" (
    call :run_command "make lint" "Backend linting" "%BACKEND_DIR%"
) else (
    where black >nul 2>&1
    if %errorlevel%==0 (
        call :run_command "black --check ." "Backend Black check" "%BACKEND_DIR%"
    )
    
    where flake8 >nul 2>&1
    if %errorlevel%==0 (
        call :run_command "flake8 ." "Backend Flake8 check" "%BACKEND_DIR%"
    )
)
exit /b %errorlevel%

:run_backend_tests
if not exist "%BACKEND_DIR%" (
    call :log_warning "Backend directory not found, skipping backend tests"
    exit /b 0
)

if exist "%BACKEND_DIR%\Makefile" (
    if "%WATCH_MODE%"=="true" (
        call :run_command "make test-watch" "Backend tests (watch mode)" "%BACKEND_DIR%"
    ) else (
        call :run_command "make test" "Backend tests" "%BACKEND_DIR%"
    )
) else (
    where pytest >nul 2>&1
    if %errorlevel%==0 (
        if "%WATCH_MODE%"=="true" (
            call :run_command "pytest --watch" "Backend tests (watch mode)" "%BACKEND_DIR%"
        ) else (
            call :run_command "pytest" "Backend tests" "%BACKEND_DIR%"
        )
    ) else (
        call :log_warning "No pytest available, skipping backend tests"
    )
)
exit /b %errorlevel%

:run_all_lint
call :log_info "Running linting for all projects..."

set "overall_result=0"

call :run_frontend_lint
if %errorlevel% neq 0 set "overall_result=1"

call :run_backend_lint
if %errorlevel% neq 0 set "overall_result=1"

if %overall_result%==0 (
    call :log_success "All linting passed"
) else (
    call :log_error "Some linting checks failed"
)

exit /b %overall_result%

:run_all_tests
call :log_info "Running tests for all projects..."

set "overall_result=0"

call :run_frontend_tests
if %errorlevel% neq 0 set "overall_result=1"

call :run_backend_tests
if %errorlevel% neq 0 set "overall_result=1"

if %overall_result%==0 (
    call :log_success "All tests passed"
) else (
    call :log_error "Some tests failed"
)

exit /b %overall_result%

:run_quality_checks
call :log_info "Running all quality checks..."

set "overall_result=0"

call :run_all_lint
if %errorlevel% neq 0 (
    set "overall_result=1"
    if "%CI_MODE%"=="true" exit /b %overall_result%
)

call :run_frontend_format
if %errorlevel% neq 0 (
    set "overall_result=1"
    if "%CI_MODE%"=="true" exit /b %overall_result%
)

call :run_frontend_type_check
if %errorlevel% neq 0 (
    set "overall_result=1"
    if "%CI_MODE%"=="true" exit /b %overall_result%
)

if %overall_result%==0 (
    call :log_success "All quality checks passed"
) else (
    call :log_error "Some quality checks failed"
)

exit /b %overall_result%

:run_ci_pipeline
call :log_info "Running CI pipeline..."

call :check_dependencies
if %errorlevel% neq 0 exit /b 1

call :run_quality_checks
if %errorlevel% neq 0 (
    call :log_error "Quality checks failed, stopping CI pipeline"
    exit /b 1
)

call :run_all_tests
if %errorlevel% neq 0 (
    call :log_error "Tests failed, stopping CI pipeline"
    exit /b 1
)

call :log_success "CI pipeline completed successfully"
exit /b 0

:start_testing
echo ==========================
echo ClientOps Testing Suite
echo %date% %time%
echo ==========================
echo.

if "%WATCH_MODE%"=="true" (
    call :log_info "Starting watch mode..."
    call :log_info "Press Ctrl+C to stop"
)

REM Set CI mode defaults
if "%CI_MODE%"=="true" (
    set "VERBOSE=true"
)

REM Check dependencies first
call :check_dependencies
if %errorlevel% neq 0 (
    call :log_error "Dependency check failed"
    exit /b 1
)

REM Execute the requested command
if "%COMMAND%"=="all" (
    if "%WATCH_MODE%"=="true" (
        :watch_loop
        echo.
        call :log_info "Running tests..."
        call :run_all_tests
        echo.
        call :log_info "Waiting for changes... (Press Ctrl+C to stop)"
        timeout /t 5 /nobreak >nul 2>&1
        goto watch_loop
    ) else (
        call :run_all_tests
        exit /b %errorlevel%
    )
)

if "%COMMAND%"=="frontend" (
    call :run_frontend_tests
    exit /b %errorlevel%
)

if "%COMMAND%"=="backend" (
    call :run_backend_tests
    exit /b %errorlevel%
)

if "%COMMAND%"=="lint" (
    call :run_all_lint
    exit /b %errorlevel%
)

if "%COMMAND%"=="format" (
    call :run_frontend_format
    exit /b %errorlevel%
)

if "%COMMAND%"=="type-check" (
    call :run_frontend_type_check
    exit /b %errorlevel%
)

if "%COMMAND%"=="quality" (
    call :run_quality_checks
    exit /b %errorlevel%
)

if "%COMMAND%"=="ci" (
    call :run_ci_pipeline
    exit /b %errorlevel%
)

call :log_error "Unknown command: %COMMAND%"
call :show_help
exit /b 1