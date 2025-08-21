"""
User management API endpoints.

This module defines FastAPI routes for user management operations including
CRUD operations, role management, status changes, search/filtering, and audit trails.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware import require_auth
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import (
    UserCreateRequest,
    UserUpdateRequest,
    UserRoleChangeRequest,
    UserStatusChangeRequest,
    UserSearchParams,
    UserListResponse,
    UserDetailResponse,
    UserCreateResponse,
    UserUpdateResponse,
    UserHistoryResponse,
    UserHistoryEntry,
    BulkUserOperation,
    BulkUserOperationResponse,
    UserDeactivateResponse,
    PaginationInfo,
)
from app.services.user_service import (
    UserService,
    UserNotFoundError,
    UserAlreadyExistsError,
    PermissionDeniedError,
)


router = APIRouter(prefix="/api/users", tags=["User Management"])


def require_hr_role(current_user: User = Depends(require_auth)) -> User:
    """
    Dependency to ensure current user has HR role.

    Args:
        current_user: Current authenticated user

    Returns:
        User: Current user if they have HR role

    Raises:
        HTTPException: 403 if user doesn't have HR role
    """
    if current_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "error",
                "message": "Access denied. HR role required.",
                "code": "USER_001",
            },
        )
    return current_user


@router.get("", response_model=UserListResponse)
async def list_users(
    search: Optional[str] = Query(None, description="Search in name and email"),
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    status: Optional[UserStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("created_at", pattern="^(full_name|email|role|status|created_at|last_login)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    date_from: Optional[str] = Query(
        None, description="Filter by creation date from (ISO format)"
    ),
    date_to: Optional[str] = Query(
        None, description="Filter by creation date to (ISO format)"
    ),
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    List all users with search, filtering, and pagination.

    Returns a paginated list of users based on search criteria and filters.
    Only accessible by HR users.

    Args:
        search: Search term for name and email
        role: Filter by user role
        status: Filter by user status
        page: Page number (1-based)
        page_size: Number of items per page
        sort_by: Field to sort by
        sort_order: Sort order (asc/desc)
        date_from: Filter by creation date from
        date_to: Filter by creation date to
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        UserListResponse: Paginated list of users

    Raises:
        HTTPException: 403 if not HR user, 400 for invalid parameters
    """
    try:
        # Parse date filters if provided
        from datetime import datetime
        date_from_dt = None
        date_to_dt = None

        if date_from:
            date_from_dt = datetime.fromisoformat(
                date_from.replace('Z', '+00:00')
            )
        if date_to:
            date_to_dt = datetime.fromisoformat(
                date_to.replace('Z', '+00:00')
            )

        # Create search parameters
        search_params = UserSearchParams(
            search=search,
            role=role,
            status=status,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            date_from=date_from_dt,
            date_to=date_to_dt,
        )

        user_service = UserService(db)
        users, pagination_info = user_service.search_users(search_params)

        return UserListResponse(
            users=[UserDetailResponse.model_validate(user) for user in users],
            pagination=PaginationInfo(**pagination_info),
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": f"Invalid parameter: {str(e)}",
                "code": "USER_002",
            },
        )


@router.post("", response_model=UserCreateResponse)
async def create_user(
    user_data: UserCreateRequest,
    request: Request,
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Create a new user account.

    Creates a new user with a temporary password and sends invitation email.
    Only accessible by HR users.

    Args:
        user_data: User creation data
        request: FastAPI request for client info
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        UserCreateResponse: Created user info with temporary password

    Raises:
        HTTPException: 403 if not HR, 409 if email exists, 400 for validation errors
    """
    try:
        user_service = UserService(db)

        # Extract client information
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        user, temp_password = user_service.create_user(
            user_data=user_data,
            created_by=current_user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        return UserCreateResponse(
            user=UserDetailResponse.model_validate(user),
            temporary_password=temp_password,
        )

    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_003",
            },
        )


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Get detailed user information by ID.

    Returns comprehensive user information including all profile fields.
    Only accessible by HR users.

    Args:
        user_id: User ID to retrieve
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        UserDetailResponse: Detailed user information

    Raises:
        HTTPException: 403 if not HR, 404 if user not found
    """
    try:
        user_service = UserService(db)
        user = user_service.get_user_by_id(user_id)
        return UserDetailResponse.model_validate(user)

    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_004",
            },
        )


@router.put("/{user_id}", response_model=UserUpdateResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdateRequest,
    request: Request,
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Update user information.

    Updates user profile information (excluding role and status).
    Only accessible by HR users.

    Args:
        user_id: User ID to update
        user_data: Updated user data
        request: FastAPI request for client info
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        UserUpdateResponse: Updated user information

    Raises:
        HTTPException: 403 if not HR, 404 if user not found
    """
    try:
        user_service = UserService(db)

        # Extract client information
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        user = user_service.update_user(
            user_id=user_id,
            user_data=user_data,
            updated_by=current_user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        return UserUpdateResponse(
            user=UserDetailResponse.model_validate(user),
        )

    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_004",
            },
        )


@router.delete("/{user_id}", response_model=UserDeactivateResponse)
async def deactivate_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Deactivate a user account (soft delete).

    Sets user status to inactive and invalidates all sessions.
    Only accessible by HR users.

    Args:
        user_id: User ID to deactivate
        request: FastAPI request for client info
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        UserDeactivateResponse: Success confirmation

    Raises:
        HTTPException: 403 if not HR or trying to deactivate self, 404 if user not found
    """
    try:
        user_service = UserService(db)

        # Extract client information
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        user_service.deactivate_user(
            user_id=user_id,
            deactivated_by=current_user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        return UserDeactivateResponse()

    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_004",
            },
        )
    except PermissionDeniedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_005",
            },
        )


@router.put("/{user_id}/role", response_model=UserUpdateResponse)
async def change_user_role(
    user_id: int,
    role_data: UserRoleChangeRequest,
    request: Request,
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Change user role.

    Updates user role and logs the change in audit trail.
    Only accessible by HR users.

    Args:
        user_id: User ID to change role
        role_data: New role information
        request: FastAPI request for client info
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        UserUpdateResponse: Updated user information

    Raises:
        HTTPException: 403 if not HR or trying to change own role, 404 if user not found
    """
    try:
        user_service = UserService(db)

        # Extract client information
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        user = user_service.change_user_role(
            user_id=user_id,
            new_role=role_data.role,
            changed_by=current_user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        return UserUpdateResponse(
            message="User role changed successfully",
            user=UserDetailResponse.model_validate(user),
        )

    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_004",
            },
        )
    except PermissionDeniedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_005",
            },
        )


@router.put("/{user_id}/status", response_model=UserUpdateResponse)
async def change_user_status(
    user_id: int,
    status_data: UserStatusChangeRequest,
    request: Request,
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Change user status (activate/deactivate).

    Updates user status and logs the change in audit trail.
    Only accessible by HR users.

    Args:
        user_id: User ID to change status
        status_data: New status information
        request: FastAPI request for client info
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        UserUpdateResponse: Updated user information

    Raises:
        HTTPException: 403 if not HR or trying to deactivate self, 404 if user not found
    """
    try:
        user_service = UserService(db)

        # Extract client information
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        user = user_service.change_user_status(
            user_id=user_id,
            new_status=status_data.status,
            changed_by=current_user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        action = "activated" if status_data.status == UserStatus.ACTIVE else "deactivated"
        return UserUpdateResponse(
            message=f"User {action} successfully",
            user=UserDetailResponse.model_validate(user),
        )

    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_004",
            },
        )
    except PermissionDeniedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_005",
            },
        )


@router.get("/{user_id}/history", response_model=UserHistoryResponse)
async def get_user_history(
    user_id: int,
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Get user audit history.

    Returns complete audit trail for the specified user.
    Only accessible by HR users.

    Args:
        user_id: User ID to get history for
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        UserHistoryResponse: User audit history

    Raises:
        HTTPException: 403 if not HR, 404 if user not found
    """
    try:
        user_service = UserService(db)
        history = user_service.get_user_history(user_id)

        # Convert history entries to response format
        history_entries = []
        for entry in history:
            # Get the name of the user who made the change
            changed_by_user = db.query(User).filter(User.id == entry.changed_by).first()
            changed_by_name = changed_by_user.full_name if changed_by_user else "Unknown User"

            history_entries.append(
                UserHistoryEntry(
                    id=entry.id,
                    action=entry.action,
                    changed_fields=entry.changed_fields,
                    old_values=entry.old_values,
                    new_values=entry.new_values,
                    changed_by=entry.changed_by,
                    changed_by_name=changed_by_name,
                    changed_at=entry.created_at,
                    ip_address=entry.ip_address,
                    user_agent=entry.user_agent,
                )
            )

        return UserHistoryResponse(history=history_entries)

    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_004",
            },
        )


@router.post("/bulk", response_model=BulkUserOperationResponse)
async def bulk_user_operations(
    operation_data: BulkUserOperation,
    request: Request,
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Perform bulk operations on multiple users.

    Allows performing operations on multiple users at once.
    Only accessible by HR users.

    Args:
        operation_data: Bulk operation data
        request: FastAPI request for client info
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        BulkUserOperationResponse: Operation results

    Raises:
        HTTPException: 403 if not HR, 400 for invalid operations
    """
    try:
        user_service = UserService(db)

        # Extract client information
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        result = user_service.bulk_user_operation(
            user_ids=operation_data.user_ids,
            operation=operation_data.operation,
            performed_by=current_user.id,
            new_role=operation_data.new_role,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        return BulkUserOperationResponse(
            message=f"Bulk {operation_data.operation} operation completed",
            results=result["results"],
            success_count=result["success_count"],
            failure_count=result["failure_count"],
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_006",
            },
        ) 
 