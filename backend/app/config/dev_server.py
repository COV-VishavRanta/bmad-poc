"""
Development configuration for uvicorn server with optimized hot reload
"""

# Uvicorn development configuration
UVICORN_CONFIG = {
    "app": "app.main:app",
    "host": "0.0.0.0",
    "port": 8000,
    "reload": True,
    "reload_dirs": ["app"],
    "reload_delay": 0.25,
    "reload_includes": ["*.py"],
    "reload_excludes": [
        "*/__pycache__/*",
        "*/.*",
        "*.pyc",
        "*.pyo",
        "*/test_*",
        "*/tests/*",
        "*/migrations/*",
    ],
    "log_level": "info",
    "access_log": True,
    "use_colors": True,
    "loop": "auto",
    "http": "auto",
    "ws": "auto",
    "lifespan": "auto",
    "interface": "auto",
    "timeout_keep_alive": 5,
    "timeout_notify": 30,
    "limit_concurrency": None,
    "limit_max_requests": None,
    "backlog": 2048,
}

# Environment-specific overrides
DEVELOPMENT_OVERRIDES = {
    "log_level": "debug",
    "reload_delay": 0.1,
    "access_log": True,
}

PRODUCTION_OVERRIDES = {
    "reload": False,
    "log_level": "warning",
    "workers": 4,
    "access_log": False,
    "timeout_keep_alive": 60,
}

# File watching optimization
WATCH_CONFIG = {
    "watch_filter": lambda path: (
        path.suffix == ".py"
        and not path.parts[-1].startswith(".")
        and "__pycache__" not in path.parts
        and "test_" not in path.name
    ),
    "ignore_paths": [
        "*.pyc",
        "*/__pycache__/*",
        "*/.*",
        "*/test_*",
        "*/tests/*",
        "*/migrations/*",
        "*/alembic/*",
        "*/logs/*",
        "*/tmp/*",
        "*/cache/*",
    ],
}