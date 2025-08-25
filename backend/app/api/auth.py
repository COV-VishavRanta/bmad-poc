"""
Authentication API endpoints.

This module provides API endpoints for user authentication,
including login, logout, and session management.
"""

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import (
    LoginRequest, LoginResponse, LogoutResponse, 
    AuthStatusResponse, UserResponse
)
from app.services.user_service import UserService
from app.utils.middleware import get_current_user, require_auth
from app.exceptions import InvalidCredentialsError
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and create session.
    
    Args:
        login_data: Login credentials
        response: FastAPI response object for setting cookies
        db: Database session
        
    Returns:
        Login response with user data
        
    Raises:
        InvalidCredentialsError: If credentials are invalid
    """
    user_service = UserService(db)
    
    # Authenticate user
    user = user_service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise InvalidCredentialsError("Invalid email or password")
    
    # Create session
    session = user_service.create_user_session(user)
    
    # Set secure session cookie
    response.set_cookie(
        key="session_token",
        value=session.session_token,
        httponly=True,
        secure=True,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=86400  # 24 hours in seconds
    )
    
    # Return user data
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_active=user.is_active,
        full_name=user.full_name,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
    
    return LoginResponse(user=user_response)


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Logout user and invalidate session.
    
    Args:
        request: FastAPI request object
        response: FastAPI response object for clearing cookies
        db: Database session
        
    Returns:
        Logout response
    """
    # Get session token from cookies
    session_token = request.cookies.get("session_token")
    
    if session_token:
        # Invalidate session in database
        user_service = UserService(db)
        user_service.invalidate_session(session_token)
    
    # Clear session cookie
    response.delete_cookie(
        key="session_token",
        httponly=True,
        secure=True,
        samesite="lax"
    )
    
    return LogoutResponse()


@router.get("/status", response_model=AuthStatusResponse)
async def auth_status(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Check authentication status.
    
    Args:
        request: FastAPI request object
        db: Database session
        
    Returns:
        Authentication status with user data if authenticated
    """
    user = get_current_user(request, db)
    
    if user:
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_active=user.is_active,
            full_name=user.full_name,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        return AuthStatusResponse(authenticated=True, user=user_response)
    
    return AuthStatusResponse(authenticated=False)