"""
Authentication middleware for FastAPI.

This module provides middleware for session-based authentication
and role-based access control.
"""

from typing import Optional, Callable, Any
from functools import wraps

from fastapi import Request, Depends
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.user_service import UserService
from app.exceptions import AuthenticationRequiredError, InsufficientPermissionsError


def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get the current authenticated user from session.
    
    Args:
        request: FastAPI request object
        db: Database session
        
    Returns:
        Current user if authenticated, None otherwise
    """
    # Get session token from cookies
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        return None
    
    # Get user service and validate session
    user_service = UserService(db)
    session = user_service.get_session_by_token(session_token)
    
    if not session:
        return None
    
    # Return the user associated with the session
    return session.user


def require_auth(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to require authentication.
    
    Args:
        request: FastAPI request object
        db: Database session
        
    Returns:
        Current authenticated user
        
    Raises:
        AuthenticationRequiredError: If user is not authenticated
    """
    user = get_current_user(request, db)
    
    if not user:
        raise AuthenticationRequiredError("Authentication required")
    
    return user


def require_role(*allowed_roles: str):
    """
    Decorator to require specific user roles.
    
    Args:
        allowed_roles: Roles that are allowed to access the endpoint
        
    Returns:
        Decorated function that checks user role
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request and user from kwargs
            request = kwargs.get('request')
            current_user = kwargs.get('current_user')
            
            if not current_user:
                # Try to get from args if not in kwargs
                for arg in args:
                    if isinstance(arg, User):
                        current_user = arg
                        break
            
            if not current_user or current_user.role not in allowed_roles:
                raise InsufficientPermissionsError(
                    f"Access denied. Required roles: {', '.join(allowed_roles)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_permission(permission: str):
    """
    Decorator to require specific permissions.
    
    Args:
        permission: Permission required to access the endpoint
        
    Returns:
        Decorated function that checks user permission
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            
            if not current_user:
                # Try to get from args if not in kwargs
                for arg in args:
                    if isinstance(arg, User):
                        current_user = arg
                        break
            
            if not current_user or not current_user.has_permission(permission):
                raise InsufficientPermissionsError(
                    f"Access denied. Required permission: {permission}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator