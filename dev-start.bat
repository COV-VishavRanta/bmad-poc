@echo off
REM ClientOps Development Environment Startup Script (Windows)
REM This script sets up and starts the complete development environment

setlocal enabledelayedexpansion

REM Parse command line arguments
set SKIP_INSTALL=false
set SKIP_BUILD=false
set USE_DOCKER=false
set FRONTEND_ONLY=false
set BACKEND_ONLY=false
set RESET_DB=false

:parse_args
if "%~1"=="--skip-install" (
    set SKIP_INSTALL=true
    shift
    goto parse_args
)
if "%~1"=="--skip-build" (
    set SKIP_BUILD=true
    shift
    goto parse_args
)
if "%~1"=="--docker" (
    set USE_DOCKER=true
    shift
    goto parse_args
)
if "%~1"=="--frontend-only" (
    set FRONTEND_ONLY=true
    shift
    goto parse_args
)
if "%~1"=="--backend-only" (
    set BACKEND_ONLY=true
    shift
    goto parse_args
)
if "%~1"=="--reset-db" (
    set RESET_DB=true
    shift
    goto parse_args
)
if "%~1"=="--help" (
    echo Usage: %0 [OPTIONS]
    echo.
    echo Options:
    echo   --skip-install    Skip dependency installation
    echo   --skip-build      Skip build processes
    echo   --docker          Use Docker for services
    echo   --frontend-only   Start only frontend
    echo   --backend-only    Start only backend
    echo   --reset-db        Reset database before starting
    echo   --help            Show this help message
    exit /b 0
)
if "%~1" neq "" (
    echo [ERROR] Unknown option: %~1
    exit /b 1
)

echo [INFO] Starting ClientOps Development Environment...

REM Check prerequisites
echo [INFO] Checking prerequisites...

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH
    exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    exit /b 1
)

where pip >nul 2>nul
if errorlevel 1 (
    echo [ERROR] pip is not installed or not in PATH
    exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    exit /b 1
)

where docker-compose >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed or not in PATH
    exit /b 1
)

echo [SUCCESS] All prerequisites are available

REM Check if .env files exist
if not exist ".env" if not exist "backend\.env" (
    echo [WARNING] No .env file found. Creating from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Created .env from .env.example. Please review and update as needed.
    ) else (
        echo [ERROR] .env.example not found. Please create .env file manually.
        exit /b 1
    )
)

REM Install dependencies
if "%SKIP_INSTALL%"=="false" (
    if "%BACKEND_ONLY%"=="false" (
        echo [INFO] Installing frontend dependencies...
        cd frontend
        npm install
        if errorlevel 1 (
            echo [ERROR] Failed to install frontend dependencies
            exit /b 1
        )
        cd ..
        echo [SUCCESS] Frontend dependencies installed
    )

    if "%FRONTEND_ONLY%"=="false" (
        echo [INFO] Installing backend dependencies...
        cd backend
        make install-dev
        if errorlevel 1 (
            echo [ERROR] Failed to install backend dependencies
            exit /b 1
        )
        cd ..
        echo [SUCCESS] Backend dependencies installed
    )
)

REM Create logs directory
if not exist "logs" mkdir logs

REM Start services with Docker
if "%USE_DOCKER%"=="true" (
    echo [INFO] Starting services with Docker...
    
    if "%RESET_DB%"=="true" (
        echo [INFO] Resetting database...
        docker-compose down -v
    )
    
    docker-compose up -d mysql
    
    REM Wait for MySQL to be ready
    echo [INFO] Waiting for MySQL to be ready...
    timeout /t 10 /nobreak >nul
    
    REM Run migrations
    echo [INFO] Running database migrations...
    docker-compose run --rm backend alembic upgrade head
    
    REM Seed database
    echo [INFO] Seeding database...
    docker-compose run --rm backend python -m app.seed_data
    
    REM Start all services
    docker-compose up
    
) else (
    REM Start services locally
    echo [INFO] Starting services locally...
    
    REM Start database with Docker (if not already running)
    docker ps | findstr mysql >nul
    if errorlevel 1 (
        echo [INFO] Starting MySQL with Docker...
        docker-compose up -d mysql
        timeout /t 10 /nobreak >nul
    )
    
    REM Handle database reset
    if "%RESET_DB%"=="true" if "%FRONTEND_ONLY%"=="false" (
        echo [INFO] Resetting database...
        cd backend
        make migrate-reset
        make seed
        cd ..
    )
    
    REM Run migrations and seed if not reset
    if "%RESET_DB%"=="false" if "%FRONTEND_ONLY%"=="false" (
        echo [INFO] Running database migrations...
        cd backend
        make migrate
        make seed
        cd ..
    )
    
    REM Start backend
    if "%FRONTEND_ONLY%"=="false" (
        echo [INFO] Starting backend server...
        cd backend
        start /b "" cmd /c "make dev > ..\logs\backend.log 2>&1"
        cd ..
        echo [SUCCESS] Backend started
        
        REM Wait for backend to start
        timeout /t 3 /nobreak >nul
        
        REM Check if backend is responding
        curl -f http://localhost:8000/api/health >nul 2>nul
        if errorlevel 1 (
            echo [WARNING] Backend health check failed - it may still be starting up
        ) else (
            echo [SUCCESS] Backend health check passed
        )
    )
    
    REM Start frontend
    if "%BACKEND_ONLY%"=="false" (
        echo [INFO] Starting frontend server...
        cd frontend
        start /b "" cmd /c "npm run dev > ..\logs\frontend.log 2>&1"
        cd ..
        echo [SUCCESS] Frontend started
        
        REM Wait for frontend to start
        timeout /t 5 /nobreak >nul
        
        REM Check if frontend is responding
        curl -f http://localhost:3000 >nul 2>nul
        if errorlevel 1 (
            echo [WARNING] Frontend health check failed - it may still be starting up
        ) else (
            echo [SUCCESS] Frontend health check passed
        )
    )
)

echo.
echo [SUCCESS] Development environment is ready!
echo.
echo Services:
if "%BACKEND_ONLY%"=="false" echo   Frontend: http://localhost:3000
if "%FRONTEND_ONLY%"=="false" (
    echo   Backend API: http://localhost:8000
    echo   API Docs: http://localhost:8000/docs
)
echo   Database: localhost:3306
echo.

if "%USE_DOCKER%"=="false" (
    echo Logs:
    if "%BACKEND_ONLY%"=="false" echo   Frontend: type logs\frontend.log
    if "%FRONTEND_ONLY%"=="false" echo   Backend: type logs\backend.log
    echo.
    echo To stop services:
    echo   Use Ctrl+C in this window or close the terminal
    echo   Database: docker-compose stop mysql
)

echo.
echo [INFO] Happy coding! 🚀

REM Keep the window open if running in Docker mode
if "%USE_DOCKER%"=="true" pause