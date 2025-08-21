@echo off
setlocal EnableDelayedExpansion

REM ClientOps Database Management Script
REM This script provides comprehensive database management for development

set "COMMAND="
set "REVISION_MESSAGE="
set "BACKUP_NAME="
set "FORCE=false"

:parse_args
if "%~1"=="" goto validate_args
if "%~1"=="status" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="upgrade" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="downgrade" (
    set "COMMAND=%~1"
    if not "%~2"=="" if not "%~2:~0,2%"=="--" (
        set "REVISION_MESSAGE=%~2"
        shift
    ) else (
        set "REVISION_MESSAGE=-1"
    )
    shift
    goto parse_args
)
if "%~1"=="create" (
    set "COMMAND=%~1"
    set "REVISION_MESSAGE=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="history" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="seed" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="reset" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="fresh" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="backup" (
    set "COMMAND=%~1"
    if not "%~2"=="" if not "%~2:~0,2%"=="--" (
        set "BACKUP_NAME=%~2"
        shift
    )
    shift
    goto parse_args
)
if "%~1"=="restore" (
    set "COMMAND=%~1"
    set "BACKUP_NAME=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="check" (
    set "COMMAND=%~1"
    shift
    goto parse_args
)
if "%~1"=="--force" (
    set "FORCE=true"
    shift
    goto parse_args
)
if "%~1"=="--help" (
    call :show_help
    exit /b 0
)
echo Unknown argument: %~1
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
echo ClientOps Database Management
echo.
echo Usage: %0 COMMAND [OPTIONS]
echo.
echo Commands:
echo   status              Show current migration status
echo   upgrade             Apply all pending migrations
echo   downgrade [target]  Downgrade to previous or specified revision
echo   create MESSAGE      Create a new migration
echo   history             Show migration history
echo   seed                Run database seeding
echo   reset               Reset database and apply all migrations
echo   fresh               Drop all tables, run migrations, and seed
echo   backup [name]       Create database backup
echo   restore name        Restore database from backup
echo   check               Check database connectivity
echo.
echo Options:
echo   --force             Force operation without confirmation
echo   --help              Show this help message
echo.
echo Examples:
echo   %0 create "Add user table"
echo   %0 backup production-backup
echo   %0 restore production-backup
echo   %0 fresh --force
goto :eof

:validate_args
if "%COMMAND%"=="" (
    call :log_error "No command specified"
    call :show_help
    exit /b 1
)

REM Check if we're in the backend directory
if not exist "alembic.ini" (
    if exist "backend" (
        call :log_info "Changing to backend directory..."
        cd backend
    ) else (
        call :log_error "This script must be run from the backend directory or project root"
        exit /b 1
    )
)

:check_dependencies
where python >nul 2>&1
if %errorlevel% neq 0 (
    call :log_error "Python is not installed"
    exit /b 1
)

python -c "import alembic" >nul 2>&1
if %errorlevel% neq 0 (
    call :log_error "Alembic is not installed. Run: pip install alembic"
    exit /b 1
)

python -c "import mysql.connector" >nul 2>&1 || python -c "import pymysql" >nul 2>&1
if %errorlevel% neq 0 (
    call :log_error "MySQL Python connector is not installed. Run: pip install pymysql"
    exit /b 1
)
goto :eof

:check_database
call :log_info "Checking database connectivity..."

python -c "from app.database import engine; from sqlalchemy import text; engine.connect().execute(text('SELECT 1'))" >nul 2>&1
if %errorlevel%==0 (
    call :log_success "Database connection successful"
    exit /b 0
) else (
    call :log_error "Database connection failed"
    exit /b 1
)

:execute_command
if "%COMMAND%"=="check" (
    call :check_dependencies
    call :check_database
    goto :eof
)

if "%COMMAND%"=="status" (
    call :log_info "Checking migration status..."
    call :check_dependencies
    
    for /f %%i in ('python -c "from alembic import command; from alembic.config import Config; cfg = Config('alembic.ini'); command.current(cfg)"') do (
        call :log_success "Current revision: %%i"
    )
    goto :eof
)

if "%COMMAND%"=="upgrade" (
    call :log_info "Upgrading database..."
    call :check_dependencies
    call :check_database
    
    alembic upgrade head
    if %errorlevel%==0 (
        call :log_success "Database upgraded successfully"
    ) else (
        call :log_error "Database upgrade failed"
        exit /b 1
    )
    goto :eof
)

if "%COMMAND%"=="downgrade" (
    call :log_info "Downgrading database to: %REVISION_MESSAGE%"
    
    if "%FORCE%"=="false" (
        set /p "confirm=Are you sure you want to downgrade? (y/N): "
        if /i not "!confirm!"=="y" (
            call :log_info "Downgrade cancelled"
            exit /b 0
        )
    )
    
    call :check_dependencies
    call :check_database
    
    alembic downgrade "%REVISION_MESSAGE%"
    if %errorlevel%==0 (
        call :log_success "Database downgraded successfully"
    ) else (
        call :log_error "Database downgrade failed"
        exit /b 1
    )
    goto :eof
)

if "%COMMAND%"=="create" (
    if "%REVISION_MESSAGE%"=="" (
        call :log_error "Migration message is required"
        echo Usage: %0 create "Migration message"
        exit /b 1
    )
    
    call :log_info "Creating new migration: %REVISION_MESSAGE%"
    call :check_dependencies
    
    alembic revision --autogenerate -m "%REVISION_MESSAGE%"
    if %errorlevel%==0 (
        call :log_success "Migration created successfully"
    ) else (
        call :log_error "Migration creation failed"
        exit /b 1
    )
    goto :eof
)

if "%COMMAND%"=="history" (
    call :log_info "Migration history:"
    call :check_dependencies
    
    alembic history --verbose
    goto :eof
)

if "%COMMAND%"=="seed" (
    call :log_info "Seeding database..."
    call :check_dependencies
    call :check_database
    
    python -c "from app.seed_data import seed_database; seed_database(); print('Database seeded successfully')"
    if %errorlevel%==0 (
        call :log_success "Database seeded successfully"
    ) else (
        call :log_error "Database seeding failed"
        exit /b 1
    )
    goto :eof
)

if "%COMMAND%"=="reset" (
    call :log_info "Resetting database..."
    
    if "%FORCE%"=="false" (
        set /p "confirm=This will reset all data. Are you sure? (y/N): "
        if /i not "!confirm!"=="y" (
            call :log_info "Reset cancelled"
            exit /b 0
        )
    )
    
    call :check_dependencies
    call :check_database
    
    alembic downgrade base
    alembic upgrade head
    python -c "from app.seed_data import seed_database; seed_database(); print('Database seeded')"
    
    if %errorlevel%==0 (
        call :log_success "Database reset and seeded successfully"
    ) else (
        call :log_error "Database reset failed"
        exit /b 1
    )
    goto :eof
)

if "%COMMAND%"=="fresh" (
    call :log_info "Fresh database setup..."
    
    if "%FORCE%"=="false" (
        set /p "confirm=This will drop all tables and recreate them. Are you sure? (y/N): "
        if /i not "!confirm!"=="y" (
            call :log_info "Fresh setup cancelled"
            exit /b 0
        )
    )
    
    call :check_dependencies
    call :check_database
    
    python -c "from app.database import engine, Base; from sqlalchemy import text; Base.metadata.drop_all(bind=engine); engine.connect().execute(text('CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)')); print('All tables dropped')"
    alembic upgrade head
    python -c "from app.seed_data import seed_database; seed_database(); print('Database seeded')"
    
    if %errorlevel%==0 (
        call :log_success "Fresh database setup completed"
    ) else (
        call :log_error "Fresh database setup failed"
        exit /b 1
    )
    goto :eof
)

if "%COMMAND%"=="backup" (
    if "%BACKUP_NAME%"=="" (
        for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set "datestr=%%c%%a%%b"
        for /f "tokens=1-2 delims=: " %%a in ('time /t') do set "timestr=%%a%%b"
        set "BACKUP_NAME=backup-!datestr!-!timestr!"
    )
    
    call :log_info "Creating backup: %BACKUP_NAME%"
    
    if not exist "backups" mkdir backups
    
    python -c "import os; from app.database import engine; from urllib.parse import urlparse; url = str(engine.url); parsed = urlparse(url); host = parsed.hostname or 'localhost'; port = parsed.port or 3306; username = parsed.username; password = parsed.password; database = parsed.path[1:]; cmd = f'mysqldump -h {host} -P {port} -u {username} -p{password} {database} > backups/%BACKUP_NAME%.sql'; print(f'Backup command: mysqldump -h {host} -P {port} -u {username} -p*** {database}'); result = os.system(cmd); exit(0 if result == 0 else 1)"
    
    if %errorlevel%==0 (
        call :log_success "Backup created: backups\%BACKUP_NAME%.sql"
    ) else (
        call :log_error "Backup creation failed"
        exit /b 1
    )
    goto :eof
)

if "%COMMAND%"=="restore" (
    if "%BACKUP_NAME%"=="" (
        call :log_error "Backup name is required"
        echo Usage: %0 restore backup-name
        exit /b 1
    )
    
    set "backup_file=backups\%BACKUP_NAME%.sql"
    if not exist "%backup_file%" (
        call :log_error "Backup file not found: %backup_file%"
        exit /b 1
    )
    
    call :log_info "Restoring from backup: %BACKUP_NAME%"
    
    if "%FORCE%"=="false" (
        set /p "confirm=This will overwrite current data. Are you sure? (y/N): "
        if /i not "!confirm!"=="y" (
            call :log_info "Restore cancelled"
            exit /b 0
        )
    )
    
    python -c "import os; from app.database import engine; from urllib.parse import urlparse; url = str(engine.url); parsed = urlparse(url); host = parsed.hostname or 'localhost'; port = parsed.port or 3306; username = parsed.username; password = parsed.password; database = parsed.path[1:]; cmd = f'mysql -h {host} -P {port} -u {username} -p{password} {database} < %backup_file%'; print(f'Restore command: mysql -h {host} -P {port} -u {username} -p*** {database}'); result = os.system(cmd); exit(0 if result == 0 else 1)"
    
    if %errorlevel%==0 (
        call :log_success "Database restored from backup: %BACKUP_NAME%"
    ) else (
        call :log_error "Database restore failed"
        exit /b 1
    )
    goto :eof
)

call :log_error "Unknown command: %COMMAND%"
call :show_help
exit /b 1

REM Execute the command
call :execute_command