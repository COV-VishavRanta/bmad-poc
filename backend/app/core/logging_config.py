"""
Logging configuration for ClientOps application.

Provides structured logging with JSON format for production and readable format
for development. Includes request ID tracking and log rotation.
"""

import json
import logging
import logging.config
import os
import sys
from datetime import datetime
from typing import Any, Dict

from pythonjsonlogger import jsonlogger


class RequestIDFilter(logging.Filter):
    """Add request ID to log records for distributed tracing."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Add request_id to the log record if available."""
        if not hasattr(record, 'request_id'):
            record.request_id = getattr(self, '_request_id', 'no-request-id')
        return True

    def set_request_id(self, request_id: str) -> None:
        """Set the current request ID."""
        self._request_id = request_id


class CustomJSONFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional fields."""

    def add_fields(
        self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]
    ) -> None:
        """Add custom fields to the log record."""
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp
        log_record['timestamp'] = datetime.utcnow().isoformat()
        
        # Add service information
        log_record['service'] = 'clientops-backend'
        log_record['version'] = os.getenv('APP_VERSION', '1.0.0')
        
        # Add environment
        log_record['environment'] = os.getenv('ENVIRONMENT', 'development')
        
        # Ensure level is included
        log_record['level'] = record.levelname


class ColoredFormatter(logging.Formatter):
    """Colored formatter for development console output."""
    
    # Color codes
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'      # Reset
    }

    def format(self, record: logging.LogRecord) -> str:
        """Format the log record with colors."""
        log_color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset_color = self.COLORS['RESET']
        
        # Add color to level name
        colored_level = f"{log_color}{record.levelname}{reset_color}"
        
        # Create the formatted message
        formatter = logging.Formatter(
            f'%(asctime)s - {colored_level} - %(name)s - %(message)s'
        )
        return formatter.format(record)


def get_log_level() -> str:
    """Get log level from environment variables."""
    env_log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
    return env_log_level if env_log_level in valid_levels else 'INFO'


def is_production() -> bool:
    """Check if running in production environment."""
    return os.getenv('ENVIRONMENT', 'development').lower() == 'production'


def setup_logging() -> None:
    """Set up logging configuration based on environment."""
    log_level = get_log_level()
    
    # Create logs directory if it doesn't exist
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    if is_production():
        # Production configuration with JSON logging
        config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'json': {
                    '()': CustomJSONFormatter,
                    'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
                }
            },
            'filters': {
                'request_id': {
                    '()': RequestIDFilter,
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': log_level,
                    'formatter': 'json',
                    'filters': ['request_id'],
                    'stream': sys.stdout
                },
                'file': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'level': log_level,
                    'formatter': 'json',
                    'filters': ['request_id'],
                    'filename': 'logs/app.log',
                    'maxBytes': 10485760,  # 10MB
                    'backupCount': 5
                },
                'error_file': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'level': 'ERROR',
                    'formatter': 'json',
                    'filters': ['request_id'],
                    'filename': 'logs/error.log',
                    'maxBytes': 10485760,  # 10MB
                    'backupCount': 5
                }
            },
            'loggers': {
                '': {  # Root logger
                    'handlers': ['console', 'file', 'error_file'],
                    'level': log_level,
                    'propagate': False
                },
                'uvicorn.access': {
                    'handlers': ['console', 'file'],
                    'level': 'INFO',
                    'propagate': False
                },
                'uvicorn.error': {
                    'handlers': ['console', 'error_file'],
                    'level': 'INFO',
                    'propagate': False
                },
                'sqlalchemy.engine': {
                    'handlers': ['file'],
                    'level': 'WARNING',
                    'propagate': False
                }
            }
        }
    else:
        # Development configuration with colored console output
        config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'colored': {
                    '()': ColoredFormatter,
                },
                'simple': {
                    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                }
            },
            'filters': {
                'request_id': {
                    '()': RequestIDFilter,
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': log_level,
                    'formatter': 'colored',
                    'filters': ['request_id'],
                    'stream': sys.stdout
                },
                'file': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'level': 'DEBUG',
                    'formatter': 'simple',
                    'filters': ['request_id'],
                    'filename': 'logs/debug.log',
                    'maxBytes': 5242880,  # 5MB
                    'backupCount': 3
                }
            },
            'loggers': {
                '': {  # Root logger
                    'handlers': ['console', 'file'],
                    'level': log_level,
                    'propagate': False
                },
                'uvicorn.access': {
                    'handlers': ['console'],
                    'level': 'INFO',
                    'propagate': False
                },
                'uvicorn.error': {
                    'handlers': ['console'],
                    'level': 'INFO',
                    'propagate': False
                },
                'sqlalchemy.engine': {
                    'handlers': ['file'],
                    'level': 'WARNING',
                    'propagate': False
                }
            }
        }
    
    logging.config.dictConfig(config)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the specified name."""
    return logging.getLogger(name)


# Request ID filter instance for use in middleware
request_id_filter = RequestIDFilter()