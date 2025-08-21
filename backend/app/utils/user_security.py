"""
Security utilities for user management operations.

This module provides security functions for user management including
privilege escalation prevention, secure password handling, and activity logging.
"""

import re
import secrets
import string
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.database import get_db


class SecurityViolationError(Exception):
    """Raised when a security violation is detected."""
    pass


class RateLimitExceededError(Exception):
    """Raised when rate limit is exceeded."""
    pass


# In-memory rate limiting storage (in production, use Redis)
_rate_limit_storage: Dict[str, Dict[str, Any]] = defaultdict(dict)


def prevent_privilege_escalation(
    current_user: User, 
    target_user_id: int, 
    new_role: Optional[UserRole] = None
) -> None:
    """
    Prevent users from escalating their own privileges.
    
    Args:
        current_user: User performing the action
        target_user_id: ID of user being modified
        new_role: New role being assigned (if applicable)
        
    Raises:
        SecurityViolationError: If privilege escalation is attempted
    """
    # Prevent users from modifying their own role
    if current_user.id == target_user_id and new_role is not None:
        raise SecurityViolationError(
            "Users cannot modify their own role. Contact another HR user."
        )
    
    # Prevent users from deactivating themselves
    if current_user.id == target_user_id:
        raise SecurityViolationError(
            "Users cannot deactivate their own account. Contact another HR user."
        )


def validate_password_complexity(password: str) -> bool:
    """
    Validate password meets complexity requirements.
    
    Args:
        password: Password to validate
        
    Returns:
        bool: True if password meets requirements
    """
    if len(password) < 12:
        return False
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        return False
    
    # Check for at least one special character
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        return False
    
    return True


def generate_secure_password(length: int = 16) -> str:
    """
    Generate a cryptographically secure password.
    
    Args:
        length: Length of password to generate (minimum 12)
        
    Returns:
        str: Secure password meeting complexity requirements
    """
    if length < 12:
        length = 12
    
    # Character sets
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # Ensure at least one from each character set
    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    
    # Fill remaining length with random choices from all sets
    all_chars = uppercase + lowercase + digits + special
    for _ in range(length - 4):
        password.append(secrets.choice(all_chars))
    
    # Shuffle the password list
    secrets.SystemRandom().shuffle(password)
    
    return ''.join(password)


def check_rate_limit(
    key: str, 
    limit: int, 
    window_minutes: int = 60,
    action: str = "operation"
) -> None:
    """
    Check if operation exceeds rate limit.
    
    Args:
        key: Unique identifier for rate limiting (e.g., user_id, ip_address)
        limit: Maximum number of operations allowed
        window_minutes: Time window in minutes
        action: Description of action for error message
        
    Raises:
        RateLimitExceededError: If rate limit is exceeded
    """
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=window_minutes)
    
    # Initialize if not exists
    if key not in _rate_limit_storage:
        _rate_limit_storage[key] = {
            'attempts': [],
            'window_start': window_start
        }
    
    # Clean old attempts outside the window
    _rate_limit_storage[key]['attempts'] = [
        attempt for attempt in _rate_limit_storage[key]['attempts']
        if attempt > window_start
    ]
    
    # Check if limit exceeded
    if len(_rate_limit_storage[key]['attempts']) >= limit:
        raise RateLimitExceededError(
            f"Rate limit exceeded: maximum {limit} {action}s per {window_minutes} minutes"
        )
    
    # Record current attempt
    _rate_limit_storage[key]['attempts'].append(now)


def sanitize_audit_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize sensitive data for audit logging.
    
    Args:
        data: Dictionary containing data to sanitize
        
    Returns:
        Dict: Sanitized data with sensitive fields removed/masked
    """
    sensitive_fields = {'password', 'password_hash', 'token', 'secret'}
    sanitized = {}
    
    for key, value in data.items():
        if key.lower() in sensitive_fields:
            sanitized[key] = '[REDACTED]'
        elif isinstance(value, dict):
            sanitized[key] = sanitize_audit_data(value)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_audit_data(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            sanitized[key] = value
    
    return sanitized


def get_client_info(request: Request) -> Dict[str, str]:
    """
    Extract client information from request.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Dict: Client information including IP and user agent
    """
    # Get real IP address (considering proxies)
    forwarded_for = request.headers.get('X-Forwarded-For')
    real_ip = request.headers.get('X-Real-IP')
    
    if forwarded_for:
        # Take the first IP if multiple
        ip_address = forwarded_for.split(',')[0].strip()
    elif real_ip:
        ip_address = real_ip
    else:
        ip_address = request.client.host if request.client else 'unknown'
    
    user_agent = request.headers.get('User-Agent', 'unknown')
    
    return {
        'ip_address': ip_address,
        'user_agent': user_agent
    }


def validate_user_operation(
    current_user: User,
    target_user_id: int,
    operation: str,
    new_role: Optional[UserRole] = None
) -> None:
    """
    Comprehensive validation for user operations.
    
    Args:
        current_user: User performing the operation
        target_user_id: ID of target user
        operation: Type of operation being performed
        new_role: New role if applicable
        
    Raises:
        SecurityViolationError: If operation violates security policies
    """
    # Check for privilege escalation
    if operation in ['role_change', 'deactivate']:
        prevent_privilege_escalation(current_user, target_user_id, new_role)
    
    # Additional role-specific validations
    if new_role and operation == 'role_change':
        # Log role changes for security monitoring
        pass  # This would integrate with security monitoring system


def require_secure_headers(request: Request) -> None:
    """
    Validate that request includes required security headers.
    
    Args:
        request: FastAPI request object
        
    Raises:
        HTTPException: If required security headers are missing
    """
    # Check for CSRF token in sensitive operations
    if request.method in ['POST', 'PUT', 'DELETE']:
        csrf_token = request.headers.get('X-CSRF-Token')
        if not csrf_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "message": "CSRF token required",
                    "code": "SECURITY_001"
                }
            )


class SecurityLogger:
    """Security event logger for user management operations."""
    
    @staticmethod
    def log_security_event(
        event_type: str,
        user_id: int,
        details: Dict[str, Any],
        client_info: Dict[str, str],
        severity: str = "INFO"
    ) -> None:
        """
        Log security events for monitoring and audit.
        
        Args:
            event_type: Type of security event
            user_id: ID of user involved
            details: Event details
            client_info: Client information
            severity: Event severity (INFO, WARNING, ERROR)
        """
        # In production, this would write to security log aggregation system
        timestamp = datetime.utcnow().isoformat()
        
        log_entry = {
            "timestamp": timestamp,
            "event_type": event_type,
            "user_id": user_id,
            "severity": severity,
            "details": sanitize_audit_data(details),
            "client_info": client_info
        }
        
        # For now, just print to console (in production: send to security system)
        print(f"[SECURITY] {timestamp} - {event_type}: {log_entry}")
    
    @staticmethod
    def log_failed_access_attempt(
        user_id: Optional[int],
        attempted_resource: str,
        client_info: Dict[str, str]
    ) -> None:
        """Log failed access attempts for security monitoring."""
        SecurityLogger.log_security_event(
            event_type="FAILED_ACCESS_ATTEMPT",
            user_id=user_id or 0,
            details={
                "attempted_resource": attempted_resource,
                "result": "ACCESS_DENIED"
            },
            client_info=client_info,
            severity="WARNING"
        )
    
    @staticmethod
    def log_privilege_escalation_attempt(
        user_id: int,
        target_user_id: int,
        attempted_action: str,
        client_info: Dict[str, str]
    ) -> None:
        """Log privilege escalation attempts."""
        SecurityLogger.log_security_event(
            event_type="PRIVILEGE_ESCALATION_ATTEMPT",
            user_id=user_id,
            details={
                "target_user_id": target_user_id,
                "attempted_action": attempted_action,
                "result": "BLOCKED"
            },
            client_info=client_info,
            severity="ERROR"
        )