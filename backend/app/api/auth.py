"""
Authentication API endpoints.

This module defines FastAPI routes for user authentication including
login, logout, current user info, session management, and password changes.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware import require_auth, get_current_user, get_session_id
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    CurrentUserResponse,
    RefreshSessionResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    UserSessionsResponse,
    SessionInfo,
    ErrorResponse,
    UserResponse,
)
from app.services.auth_service import (
    AuthService,
    InvalidCredentialsError,
    AccountInactiveError,
    SessionExpiredError,
    RateLimitExceededError,
)
from app.utils.security import mask_session_id

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Cookie configuration
COOKIE_NAME = "clientops_session"
COOKIE_SECURE = True  # Set to False for development over HTTP
COOKIE_SAMESITE = "lax"
COOKIE_HTTPONLY = True


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Authenticate user and create session.

    Creates a new user session and sets HttpOnly cookie for authentication.
    Returns user information upon successful login.

    Args:
        login_data: Login credentials (email and password)
        request: FastAPI request object for IP and user agent
        response: FastAPI response object for setting cookies
        db: Database session

    Returns:
        LoginResponse: Success response with user information

    Raises:
        HTTPException: 401 for invalid credentials, 403 for inactive account
    """
    try:
        auth_service = AuthService(db)

        # Extract client information
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # Authenticate user and create session
        user, session = auth_service.authenticate_user(
            email=login_data.email,
            password=login_data.password,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        # Set session cookie
        response.set_cookie(
            key=COOKIE_NAME,
            value=session.session_id,
            httponly=COOKIE_HTTPONLY,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
            # Note: expires is handled by session validation logic, not cookie expiry
        )

        return LoginResponse(
            user=UserResponse.model_validate(user),
        )

    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status": "error",
                "message": str(e),
                "code": "AUTH_001",
            },
        )
    except AccountInactiveError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "error",
                "message": str(e),
                "code": "AUTH_004",
            },
        )
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "status": "error",
                "message": str(e),
                "code": "AUTH_005",
            },
        )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    session_id: Optional[str] = Depends(get_session_id),
    db: Session = Depends(get_db),
):
    """
    Logout user and invalidate session.

    Removes session from database and clears authentication cookie.

    Args:
        response: FastAPI response object for clearing cookies
        session_id: Current session ID from middleware
        db: Database session

    Returns:
        LogoutResponse: Success response
    """
    if session_id:
        auth_service = AuthService(db)
        auth_service.logout_user(session_id)

    # Clear session cookie
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )

    return LogoutResponse()


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_info(
    current_user: User = Depends(require_auth),
):
    """
    Get current authenticated user information.

    Returns information about the currently authenticated user
    including role and status.

    Args:
        current_user: Current authenticated user from middleware

    Returns:
        CurrentUserResponse: User information
    """
    return CurrentUserResponse(
        user=UserResponse.from_orm(current_user),
    )


@router.post("/refresh", response_model=RefreshSessionResponse)
async def refresh_session(
    session_id: str = Depends(get_session_id),
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    Refresh current session expiration time.

    Extends the current session expiration by 24 hours from now.

    Args:
        session_id: Current session ID from middleware
        current_user: Current authenticated user from middleware
        db: Database session

    Returns:
        RefreshSessionResponse: Success response

    Raises:
        HTTPException: 401 if session cannot be refreshed
    """
    auth_service = AuthService(db)
    success = auth_service.refresh_session(session_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status": "error",
                "message": "Unable to refresh session",
                "code": "AUTH_006",
            },
        )

    return RefreshSessionResponse()


@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    Change user password.

    Allows authenticated user to change their password after
    verifying their current password.

    Args:
        password_data: Current and new password information
        current_user: Current authenticated user from middleware
        db: Database session

    Returns:
        ChangePasswordResponse: Success response

    Raises:
        HTTPException: 400 for validation errors, 401 for incorrect current password
    """
    try:
        auth_service = AuthService(db)
        auth_service.change_password(
            user_id=current_user.id,
            current_password=password_data.current_password,
            new_password=password_data.new_password,
        )

        return ChangePasswordResponse()

    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status": "error",
                "message": str(e),
                "code": "AUTH_007",
            },
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": str(e),
                "code": "AUTH_008",
            },
        )


@router.get("/sessions", response_model=UserSessionsResponse)
async def get_user_sessions(
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    Get all active sessions for current user.

    Returns list of all active sessions for the authenticated user
    including session metadata like IP address and user agent.

    Args:
        current_user: Current authenticated user from middleware
        db: Database session

    Returns:
        UserSessionsResponse: List of active sessions
    """
    auth_service = AuthService(db)
    sessions = auth_service.get_user_active_sessions(current_user.id)

    session_info = []
    for session in sessions:
        session_info.append(
            SessionInfo(
                session_id=mask_session_id(session.session_id),
                expires_at=session.expires_at,
                last_accessed=session.last_accessed,
                ip_address=session.ip_address,
                user_agent=session.user_agent,
            )
        )

    return UserSessionsResponse(sessions=session_info)


@router.delete("/sessions/all", response_model=LogoutResponse)
async def logout_all_sessions(
    response: Response,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    Logout from all sessions.

    Invalidates all sessions for the current user across all devices
    and clears the current session cookie.

    Args:
        response: FastAPI response object for clearing cookies
        current_user: Current authenticated user from middleware
        db: Database session

    Returns:
        LogoutResponse: Success response
    """
    auth_service = AuthService(db)
    count = auth_service.logout_all_user_sessions(current_user.id)

    # Clear session cookie
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )

    return LogoutResponse(
        message=f"Logged out from {count} sessions successfully"
    )