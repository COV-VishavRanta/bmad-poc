@echo off
setlocal EnableDelayedExpansion

REM ClientOps Development Environment Health Check Script
REM This script checks the health of all development services

set "DETAILED=false"
set "CONTINUOUS=false"
set "INTERVAL=30"

:parse_args
if "%~1"=="" goto start_health_check
if "%~1"=="--detailed" (
    set "DETAILED=true"
    shift
    goto parse_args
)
if "%~1"=="--continuous" (
    set "CONTINUOUS=true"
    shift
    goto parse_args
)
if "%~1"=="--interval" (
    set "INTERVAL=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--help" (
    echo Usage: %0 [OPTIONS]
    echo.
    echo Options:
    echo   --detailed    Show detailed health information
    echo   --continuous  Run health checks continuously
    echo   --interval N  Set interval for continuous checks ^(default: 30s^)
    echo   --help        Show this help message
    exit /b 0
)
echo Unknown option: %~1
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

:check_service
set "service_name=%~1"
set "url=%~2"
set "timeout=%~3"
if "%timeout%"=="" set "timeout=5"

curl -f --max-time %timeout% "%url%" >nul 2>&1
if %errorlevel%==0 (
    call :log_success "%service_name% is healthy"
    exit /b 0
) else (
    call :log_error "%service_name% is not responding"
    exit /b 1
)

:check_port
set "service_name=%~1"
set "host=%~2"
set "port=%~3"

powershell -Command "Test-NetConnection -ComputerName %host% -Port %port% -InformationLevel Quiet" >nul 2>&1
if %errorlevel%==0 (
    call :log_success "%service_name% port %port% is open"
    exit /b 0
) else (
    call :log_error "%service_name% port %port% is not accessible"
    exit /b 1
)

:health_check
echo ==========================
echo ClientOps Health Check
echo %date% %time%
echo ==========================
echo.

set "overall_health=0"

REM Check prerequisite tools
call :log_info "Checking prerequisites..."

where node >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=*" %%i in ('node --version') do call :log_success "Node.js is available (%%i)"
) else (
    call :log_error "Node.js is not installed"
    set "overall_health=1"
)

where npm >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=*" %%i in ('npm --version') do call :log_success "npm is available (%%i)"
) else (
    call :log_error "npm is not installed"
    set "overall_health=1"
)

where python >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=*" %%i in ('python --version') do call :log_success "Python is available (%%i)"
) else (
    call :log_error "Python is not installed"
    set "overall_health=1"
)

where docker >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=3" %%i in ('docker --version') do call :log_success "Docker is available (%%i)"
) else (
    call :log_error "Docker is not installed"
    set "overall_health=1"
)

echo.

REM Check database
call :log_info "Checking database..."

call :check_port "MySQL" "localhost" "3306"
if %errorlevel% neq 0 set "overall_health=1"

echo.

REM Check backend
call :log_info "Checking backend services..."

call :check_service "Backend API" "http://localhost:8000/api/health"
if %errorlevel%==0 (
    if "%DETAILED%"=="true" (
        curl -s "http://localhost:8000/api/health" 2>nul | python -m json.tool 2>nul >nul
        if !errorlevel!==0 (
            call :log_info "Backend health details available"
        )
    )
) else (
    set "overall_health=1"
)

echo.

REM Check frontend
call :log_info "Checking frontend services..."

call :check_service "Frontend" "http://localhost:3000"
if %errorlevel% neq 0 set "overall_health=1"

echo.

REM Check processes
call :log_info "Checking running processes..."

tasklist /FI "IMAGENAME eq python.exe" /FO CSV | findstr /C:"uvicorn" >nul 2>&1
if %errorlevel%==0 (
    call :log_success "Backend server process is running"
) else (
    call :log_warning "Backend server process not found"
)

tasklist /FI "IMAGENAME eq node.exe" /FO CSV | findstr /C:"next" >nul 2>&1
if %errorlevel%==0 (
    call :log_success "Frontend server process is running"
) else (
    call :log_warning "Frontend server process not found"
)

echo.

REM Check log files
if "%DETAILED%"=="true" (
    call :log_info "Checking log files..."
    
    if exist "logs\backend.log" (
        for /f %%i in ('type "logs\backend.log" ^| find /c /v ""') do call :log_info "Backend log: %%i lines"
    ) else (
        call :log_warning "Backend log file not found"
    )
    
    if exist "logs\frontend.log" (
        for /f %%i in ('type "logs\frontend.log" ^| find /c /v ""') do call :log_info "Frontend log: %%i lines"
    ) else (
        call :log_warning "Frontend log file not found"
    )
    
    echo.
)

REM Overall status
if "%overall_health%"=="0" (
    call :log_success "All services are healthy! 🎉"
) else (
    call :log_error "Some services are not healthy. Check the details above."
)

echo.
echo Services URLs:
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:8000
echo   API Documentation: http://localhost:8000/docs
echo   Database: localhost:3306

exit /b %overall_health%

:start_health_check
if "%CONTINUOUS%"=="true" (
    call :log_info "Starting continuous health monitoring (interval: %INTERVAL%s)"
    call :log_info "Press Ctrl+C to stop"
    echo.
    
    :continuous_loop
    call :health_check
    echo.
    call :log_info "Waiting %INTERVAL% seconds..."
    timeout /t %INTERVAL% /nobreak >nul 2>&1
    cls
    goto continuous_loop
) else (
    call :health_check
)