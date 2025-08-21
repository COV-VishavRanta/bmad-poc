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
from app.utils.user_security import (
    check_rate_limit,
    get_client_info,
    SecurityLogger,
    RateLimitExceededError,
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
    Change user role with enhanced security controls.

    Updates user role and logs the change in audit trail.
    Only accessible by HR users. Includes rate limiting and security monitoring.

    Args:
        user_id: User ID to change role
        role_data: New role information
        request: FastAPI request for client info
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        UserUpdateResponse: Updated user information

    Raises:
        HTTPException: 400 if user not found, 403 if self-modification,
                      429 if rate limit exceeded
    """
    try:
        # Get client information for security logging
        client_info = get_client_info(request)
        
        # Rate limiting: max 10 role changes per hour per user
        check_rate_limit(
            key=f"role_change_{current_user.id}",
            limit=10,
            window_minutes=60,
            action="role change"
        )
        
        user_service = UserService(db)
        updated_user = user_service.change_user_role(
            user_id=user_id,
            new_role=role_data.role,
            changed_by=current_user.id,
            ip_address=client_info['ip_address'],
            user_agent=client_info['user_agent'],
        )

        return UserUpdateResponse(
            message="User role changed successfully",
            user=UserDetailResponse.model_validate(updated_user),
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
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_007",
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
    Change user status (activate/deactivate) with enhanced security controls.

    Updates user status and logs the change in audit trail.
    Only accessible by HR users. Includes rate limiting and security monitoring.

    Args:
        user_id: User ID to change status
        status_data: New status information
        request: FastAPI request for client info
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        UserUpdateResponse: Updated user information

    Raises:
        HTTPException: 403 if not HR or trying to deactivate self, 404 if user not found,
                      429 if rate limit exceeded
    """
    try:
        # Get client information for security logging
        client_info = get_client_info(request)
        
        # Rate limiting: max 20 status changes per hour per user
        check_rate_limit(
            key=f"status_change_{current_user.id}",
            limit=20,
            window_minutes=60,
            action="status change"
        )
        
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
        )


@router.get("/{user_id}/access-history")
async def get_user_access_history(
    user_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Records per page"),
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Get user access history including logins and system activity.

    Returns comprehensive access history for the specified user including
    login/logout events, audit trail, and system activity.

    Args:
        user_id: ID of user to get history for
        days: Number of days to look back (1-365)
        page: Page number for pagination
        page_size: Records per page (1-500)
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        User access history with events and pagination info

    Raises:
        HTTPException: 404 if user not found, 403 if not HR
    """
    try:
        user_service = UserService(db)
        history = user_service.get_user_access_history(
            user_id=user_id,
            days=days,
            page=page,
            page_size=page_size,
        )
        return history

    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": "User not found",
                "code": "USER_001",
            },
        )


@router.post("/{user_id}/deactivate-cascade")
async def deactivate_user_with_cascade(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Deactivate user with cascade effects.

    Deactivates a user and handles all cascade effects including:
    - Terminating all user sessions
    - Removing from active assignments
    - Creating comprehensive audit trail

    Args:
        user_id: ID of user to deactivate
        request: FastAPI request for client info
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        Details of cascade effects performed

    Raises:
        HTTPException: 404 if user not found, 403 if not HR or trying to deactivate self
    """
    try:
        user_service = UserService(db)

        # Extract client information
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        result = user_service.handle_user_deactivation_cascade(
            user_id=user_id,
            deactivated_by=current_user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        return result

    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": "User not found",
                "code": "USER_001",
            },
        )
    except PermissionDeniedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_003",
            },
        )


@router.get("/audit-trail/export")
async def export_audit_trail(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    actions: Optional[str] = Query(None, description="Comma-separated list of actions to filter"),
    export_format: str = Query("csv", regex="^(csv|json)$", description="Export format"),
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Export audit trail data for reporting and compliance.

    Exports user audit trail data in CSV or JSON format with optional filtering.

    Args:
        user_id: Optional user ID to filter by
        start_date: Optional start date for filtering (ISO format)
        end_date: Optional end date for filtering (ISO format)
        actions: Optional comma-separated list of actions to filter
        export_format: Export format ('csv' or 'json')
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        Raw audit trail data in requested format

    Raises:
        HTTPException: 403 if not HR, 400 for invalid parameters
    """
    try:
        from datetime import datetime
        from fastapi.responses import Response

        user_service = UserService(db)

        # Parse dates if provided
        parsed_start_date = None
        parsed_end_date = None
        if start_date:
            try:
                parsed_start_date = datetime.fromisoformat(start_date)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "status": "error",
                        "message": "Invalid start_date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)",
                        "code": "USER_007",
                    },
                )

        if end_date:
            try:
                parsed_end_date = datetime.fromisoformat(end_date)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "status": "error",
                        "message": "Invalid end_date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)",
                        "code": "USER_007",
                    },
                )

        # Parse actions if provided
        parsed_actions = None
        if actions:
            parsed_actions = [action.strip() for action in actions.split(",")]

        # Export data
        export_data = user_service.export_audit_trail(
            user_id=user_id,
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            actions=parsed_actions,
            export_format=export_format,
        )

        # Set appropriate content type and filename
        if export_format == "csv":
            media_type = "text/csv"
            filename = f"audit_trail_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        else:
            media_type = "application/json"
            filename = f"audit_trail_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        headers = {
            "Content-Disposition": f"attachment; filename={filename}"
        }

        return Response(
            content=export_data,
            media_type=media_type,
            headers=headers,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": str(e),
                "code": "USER_007",
            },
        )


@router.post("/audit-trail/cleanup")
async def cleanup_audit_trail(
    retention_days: int = Query(365, ge=30, le=3650, description="Retention period in days"),
    confirm: bool = Query(False, description="Confirmation flag for destructive operation"),
    current_user: User = Depends(require_hr_role),
    db: Session = Depends(get_db),
):
    """
    Clean up old audit trail records based on retention policy.

    Removes audit trail records older than the specified retention period.
    This is a destructive operation that requires confirmation.

    Args:
        retention_days: Number of days to retain audit records (30-3650)
        confirm: Confirmation flag (must be true to proceed)
        current_user: Current authenticated HR user
        db: Database session

    Returns:
        Cleanup operation results

    Raises:
        HTTPException: 403 if not HR, 400 if not confirmed or invalid parameters
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": "Cleanup operation requires confirmation. Set confirm=true to proceed.",
                "code": "USER_008",
            },
        )

    try:
        user_service = UserService(db)
        result = user_service.cleanup_audit_trail(retention_days=retention_days)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "message": f"Cleanup operation failed: {str(e)}",
                "code": "USER_009",
            },
        )
