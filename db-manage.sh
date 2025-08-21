#!/bin/bash

# ClientOps Database Management Script
# This script provides comprehensive database management for development

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

# Check if we're in the backend directory
if [ ! -f "alembic.ini" ]; then
    if [ -d "backend" ]; then
        log_info "Changing to backend directory..."
        cd backend
    else
        log_error "This script must be run from the backend directory or project root"
        exit 1
    fi
fi

# Parse command line arguments
COMMAND=""
REVISION_MESSAGE=""
BACKUP_NAME=""
FORCE=false

show_help() {
    echo "ClientOps Database Management"
    echo ""
    echo "Usage: $0 COMMAND [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  status              Show current migration status"
    echo "  upgrade             Apply all pending migrations"
    echo "  downgrade [target]  Downgrade to previous or specified revision"
    echo "  create MESSAGE      Create a new migration"
    echo "  history             Show migration history"
    echo "  seed                Run database seeding"
    echo "  reset               Reset database and apply all migrations"
    echo "  fresh               Drop all tables, run migrations, and seed"
    echo "  backup [name]       Create database backup"
    echo "  restore name        Restore database from backup"
    echo "  check               Check database connectivity"
    echo ""
    echo "Options:"
    echo "  --force             Force operation without confirmation"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 create \"Add user table\""
    echo "  $0 backup production-backup"
    echo "  $0 restore production-backup"
    echo "  $0 fresh --force"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        status|upgrade|downgrade|create|history|seed|reset|fresh|backup|restore|check)
            COMMAND="$1"
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            if [ "$COMMAND" = "create" ] && [ -z "$REVISION_MESSAGE" ]; then
                REVISION_MESSAGE="$1"
            elif [ "$COMMAND" = "backup" ] && [ -z "$BACKUP_NAME" ]; then
                BACKUP_NAME="$1"
            elif [ "$COMMAND" = "restore" ] && [ -z "$BACKUP_NAME" ]; then
                BACKUP_NAME="$1"
            elif [ "$COMMAND" = "downgrade" ] && [ -z "$REVISION_MESSAGE" ]; then
                REVISION_MESSAGE="$1"
            else
                log_error "Unknown argument: $1"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

if [ -z "$COMMAND" ]; then
    log_error "No command specified"
    show_help
    exit 1
fi

# Check dependencies
check_dependencies() {
    if ! command -v python &> /dev/null; then
        log_error "Python is not installed"
        exit 1
    fi
    
    if ! python -c "import alembic" &> /dev/null; then
        log_error "Alembic is not installed. Run: pip install alembic"
        exit 1
    fi
    
    if ! python -c "import mysql.connector" &> /dev/null && ! python -c "import pymysql" &> /dev/null; then
        log_error "MySQL Python connector is not installed. Run: pip install pymysql"
        exit 1
    fi
}

# Check database connectivity
check_database() {
    log_info "Checking database connectivity..."
    
    if python -c "
from app.database import engine
from sqlalchemy import text
try:
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('OK')
except Exception as e:
    print(f'FAILED: {e}')
    exit(1)
" | grep -q "OK"; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Database connection failed"
        return 1
    fi
}

# Get current migration revision
get_current_revision() {
    python -c "
import alembic.config
from alembic import command
from alembic.script import ScriptDirectory
from alembic.runtime.environment import EnvironmentContext

try:
    cfg = alembic.config.Config('alembic.ini')
    script_dir = ScriptDirectory.from_config(cfg)
    
    def get_revision(rev, context):
        global current_rev
        current_rev = context.get_current_revision()
        return []
    
    current_rev = None
    with EnvironmentContext(cfg, script_dir, fn=get_revision):
        pass
    
    if current_rev:
        print(current_rev[:8])
    else:
        print('none')
except Exception as e:
    print('error')
"
}

# Execute command
case $COMMAND in
    check)
        check_dependencies
        check_database
        ;;
        
    status)
        log_info "Checking migration status..."
        check_dependencies
        
        current=$(get_current_revision)
        if [ "$current" = "error" ]; then
            log_error "Could not determine current revision"
            exit 1
        elif [ "$current" = "none" ]; then
            log_warning "No migrations have been applied"
        else
            log_success "Current revision: $current"
        fi
        
        # Show pending migrations
        if alembic current &> /dev/null; then
            if ! alembic check &> /dev/null; then
                log_warning "There are pending migrations"
                alembic show head
            else
                log_success "Database is up to date"
            fi
        fi
        ;;
        
    upgrade)
        log_info "Upgrading database..."
        check_dependencies
        check_database
        
        alembic upgrade head
        log_success "Database upgraded successfully"
        ;;
        
    downgrade)
        target=${REVISION_MESSAGE:-"-1"}
        log_info "Downgrading database to: $target"
        
        if [ "$FORCE" = false ]; then
            read -p "Are you sure you want to downgrade? (y/N): " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Downgrade cancelled"
                exit 0
            fi
        fi
        
        check_dependencies
        check_database
        
        alembic downgrade "$target"
        log_success "Database downgraded successfully"
        ;;
        
    create)
        if [ -z "$REVISION_MESSAGE" ]; then
            log_error "Migration message is required"
            echo "Usage: $0 create \"Migration message\""
            exit 1
        fi
        
        log_info "Creating new migration: $REVISION_MESSAGE"
        check_dependencies
        
        # Auto-generate migration
        alembic revision --autogenerate -m "$REVISION_MESSAGE"
        log_success "Migration created successfully"
        
        # Show the created file
        latest_migration=$(ls -1t alembic/versions/*.py | head -n 1)
        log_info "Created migration file: $latest_migration"
        ;;
        
    history)
        log_info "Migration history:"
        check_dependencies
        
        alembic history --verbose
        ;;
        
    seed)
        log_info "Seeding database..."
        check_dependencies
        check_database
        
        python -c "
from app.seed_data import seed_database
seed_database()
print('Database seeded successfully')
"
        log_success "Database seeded successfully"
        ;;
        
    reset)
        log_info "Resetting database..."
        
        if [ "$FORCE" = false ]; then
            read -p "This will reset all data. Are you sure? (y/N): " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Reset cancelled"
                exit 0
            fi
        fi
        
        check_dependencies
        check_database
        
        # Downgrade to base
        alembic downgrade base
        log_success "Database downgraded to base"
        
        # Upgrade to head
        alembic upgrade head
        log_success "Database upgraded to latest"
        
        # Seed data
        python -c "
from app.seed_data import seed_database
seed_database()
print('Database seeded')
"
        log_success "Database reset and seeded successfully"
        ;;
        
    fresh)
        log_info "Fresh database setup..."
        
        if [ "$FORCE" = false ]; then
            read -p "This will drop all tables and recreate them. Are you sure? (y/N): " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Fresh setup cancelled"
                exit 0
            fi
        fi
        
        check_dependencies
        check_database
        
        # Drop all tables
        python -c "
from app.database import engine, Base
from sqlalchemy import text

# Drop all tables
Base.metadata.drop_all(bind=engine)
print('All tables dropped')

# Create alembic version table and set to head
with engine.connect() as conn:
    conn.execute(text('CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)'))
    conn.commit()
"
        log_success "All tables dropped"
        
        # Create tables
        alembic upgrade head
        log_success "Database recreated"
        
        # Seed data
        python -c "
from app.seed_data import seed_database
seed_database()
print('Database seeded')
"
        log_success "Fresh database setup completed"
        ;;
        
    backup)
        if [ -z "$BACKUP_NAME" ]; then
            BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        fi
        
        log_info "Creating backup: $BACKUP_NAME"
        
        # Create backups directory
        mkdir -p backups
        
        # Create MySQL dump
        python -c "
import os
from app.database import engine
from urllib.parse import urlparse

url = str(engine.url)
parsed = urlparse(url)

# Extract connection details
host = parsed.hostname or 'localhost'
port = parsed.port or 3306
username = parsed.username
password = parsed.password
database = parsed.path[1:]  # Remove leading /

# Create mysqldump command
cmd = f'mysqldump -h {host} -P {port} -u {username} -p{password} {database} > backups/$BACKUP_NAME.sql'
print(f'Backup command: mysqldump -h {host} -P {port} -u {username} -p*** {database}')

# Execute backup
result = os.system(cmd)
if result == 0:
    print('Backup created successfully')
else:
    print('Backup failed')
    exit(1)
" && log_success "Backup created: backups/$BACKUP_NAME.sql"
        ;;
        
    restore)
        if [ -z "$BACKUP_NAME" ]; then
            log_error "Backup name is required"
            echo "Usage: $0 restore backup-name"
            exit 1
        fi
        
        backup_file="backups/$BACKUP_NAME.sql"
        if [ ! -f "$backup_file" ]; then
            log_error "Backup file not found: $backup_file"
            exit 1
        fi
        
        log_info "Restoring from backup: $BACKUP_NAME"
        
        if [ "$FORCE" = false ]; then
            read -p "This will overwrite current data. Are you sure? (y/N): " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Restore cancelled"
                exit 0
            fi
        fi
        
        # Restore MySQL dump
        python -c "
import os
from app.database import engine
from urllib.parse import urlparse

url = str(engine.url)
parsed = urlparse(url)

# Extract connection details
host = parsed.hostname or 'localhost'
port = parsed.port or 3306
username = parsed.username
password = parsed.password
database = parsed.path[1:]  # Remove leading /

# Create mysql restore command
cmd = f'mysql -h {host} -P {port} -u {username} -p{password} {database} < $backup_file'
print(f'Restore command: mysql -h {host} -P {port} -u {username} -p*** {database}')

# Execute restore
result = os.system(cmd)
if result == 0:
    print('Restore completed successfully')
else:
    print('Restore failed')
    exit(1)
" && log_success "Database restored from backup: $BACKUP_NAME"
        ;;
        
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac