.PHONY: help dev dev-debug dev-fast dev-profile lint format test test-cov type-check migrate migrate-create migrate-reset seed clean install health health-db health-full health-monitor logs db-status db-migrate db-reset db-fresh test-all test-ci test-quality

dev:  ## Start development server with hot reload
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info --reload-dir app --reload-delay 0.25

dev-debug:  ## Start development server with debug logging
	LOG_LEVEL=DEBUG uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug --reload-dir app --reload-delay 0.25

dev-fast:  ## Start development server with optimized hot reload
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info --reload-dir app --reload-delay 0.1 --reload-include="*.py" --reload-exclude="*/__pycache__/*"

dev-profile:  ## Start development server with profiling
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info --reload-dir app --access-logv-debug lint format test test-cov type-check migrate migrate-create migrate-reset seed clean install health health-db health-full health-monitor logs db-status db-migrate db-reset db-fresh test-all test-ci test-quality

help:  ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install:  ## Install dependencies
	pip install -r requirements.txt
	pip install black flake8 isort mypy pre-commit python-json-logger

install-dev:  ## Install development dependencies
	$(MAKE) install
	pre-commit install

dev:  ## Start development server with auto-reload
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info

dev-debug:  ## Start development server with debug logging
	LOG_LEVEL=DEBUG uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug

dev-prod:  ## Start server in production mode
	ENVIRONMENT=production uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

lint:  ## Run linting checks
	flake8 app/
	mypy app/

lint-fix:  ## Run linting with auto-fix
	black app/ --check
	isort app/ --check-only

format:  ## Format code with black and isort
	black app/
	isort app/

format-check:  ## Check code formatting without changes
	black app/ --check
	isort app/ --check-only

type-check:  ## Run type checking with mypy
	mypy app/

test:  ## Run tests
	pytest app/tests/ -v

test-watch:  ## Run tests in watch mode
	pytest-watch app/tests/ -- -v

test-cov:  ## Run tests with coverage
	pytest app/tests/ -v --cov=app --cov-report=html --cov-report=term --cov-report=xml

test-unit:  ## Run unit tests only
	pytest app/tests/ -v -m "unit"

test-integration:  ## Run integration tests only
	pytest app/tests/ -v -m "integration"

migrate:  ## Run database migrations
	alembic upgrade head

migrate-create:  ## Create new migration (usage: make migrate-create MESSAGE="description")
	alembic revision --autogenerate -m "$(MESSAGE)"

migrate-reset:  ## Reset database and run all migrations
	alembic downgrade base
	alembic upgrade head

migrate-history:  ## Show migration history
	alembic history --verbose

seed:  ## Seed database with test data
	python -m app.seed_data

seed-fresh:  ## Reset database and seed with fresh data
	$(MAKE) migrate-reset
	$(MAKE) seed

health:  ## Check application health
	curl -f http://localhost:8000/api/health || echo "Backend not responding"

health-db:  ## Check database health
	curl -f http://localhost:8000/api/health/database || echo "Database not responding"

health-full:  ## Run comprehensive health check
	@echo "🔍 Running comprehensive health check..."
	@chmod +x ../dev-health.sh
	@../dev-health.sh --detailed

health-monitor:  ## Start continuous health monitoring
	@echo "📊 Starting health monitoring..."
	@chmod +x ../dev-health.sh
	@../dev-health.sh --continuous --interval 10

logs:  ## Show application logs
	tail -f logs/app.log

logs-error:  ## Show error logs
	tail -f logs/error.log

clean:  ## Clean cache and temporary files
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	rm -rf htmlcov/
	rm -rf .coverage

clean-logs:  ## Clean log files
	rm -rf logs/*.log

check-all:  ## Run all quality checks
	$(MAKE) format-check
	$(MAKE) lint
	$(MAKE) type-check
	$(MAKE) test

fix-all:  ## Fix all code quality issues
	$(MAKE) format
	$(MAKE) lint-fix

docker-build:  ## Build Docker image
	docker build -t clientops-backend .

docker-run:  ## Run Docker container
	docker run -p 8000:8000 clientops-backend

docker-dev:  ## Run Docker container in development mode
	docker run -p 8000:8000 -v $(PWD):/app clientops-backend

setup-dev:  ## Setup development environment
	$(MAKE) install-dev
	$(MAKE) migrate
	$(MAKE) seed
	@echo "Development environment setup complete!"

reset-dev:  ## Reset development environment
	$(MAKE) clean
	$(MAKE) clean-logs
	$(MAKE) seed-fresh
	@echo "Development environment reset complete!"

# Database management shortcuts
db-status:  ## Check database migration status
	@chmod +x ../db-manage.sh
	@../db-manage.sh status

db-migrate:  ## Apply database migrations
	@chmod +x ../db-manage.sh
	@../db-manage.sh upgrade

db-reset:  ## Reset database with fresh data
	@chmod +x ../db-manage.sh
	@../db-manage.sh reset --force

db-fresh:  ## Fresh database setup
	@chmod +x ../db-manage.sh
	@../db-manage.sh fresh --force

# Testing automation shortcuts
test-all:  ## Run all tests (frontend + backend)
	@chmod +x ../test-automation.sh
	@../test-automation.sh all

test-ci:  ## Run CI pipeline
	@chmod +x ../test-automation.sh
	@../test-automation.sh ci

test-quality:  ## Run quality checks
	@chmod +x ../test-automation.sh
	@../test-automation.sh quality