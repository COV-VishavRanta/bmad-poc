"""
User management service for CRUD operations and business logic.

This module provides the UserService class for handling user management
operations including creation, updates, role changes, status management,
search/filtering, and audit trail tracking.
"""

import secrets
import string
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from sqlalchemy import and_, or_, desc, asc, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.user import User, UserRole, UserStatus
from app.models.user_history import UserHistory
from app.schemas.user import UserSearchParams, UserCreateRequest, UserUpdateRequest
from app.utils.security import hash_password, generate_secure_password
from app.utils.user_security import (
    prevent_privilege_escalation,
    validate_user_operation,
    SecurityViolationError,
    SecurityLogger,
    sanitize_audit_data,
)


class UserNotFoundError(Exception):
    """Raised when a user is not found."""
    pass


class UserAlreadyExistsError(Exception):
    """Raised when trying to create a user with an existing email."""
    pass


class PermissionDeniedError(Exception):
    """Raised when user doesn't have permission for an operation."""
    pass


class UserService:
    """
    Service class for user management operations.

    Handles all user-related business logic including CRUD operations,
    role management, status changes, search/filtering, and audit trail.
    """

    def __init__(self, db: Session):
        """
        Initialize UserService with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create_user(
        self,
        user_data: UserCreateRequest,
        created_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[User, str]:
        """
        Create a new user with temporary password.

        Args:
            user_data: User creation data
            created_by: ID of the user creating this user
            ip_address: IP address of the creator
            user_agent: User agent of the creator

        Returns:
            Tuple of (created user, temporary password)

        Raises:
            UserAlreadyExistsError: If email already exists
        """
        # Check if email already exists
        existing_user = self.db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise UserAlreadyExistsError(f"User with email {user_data.email} already exists")

        # Generate temporary password
        temp_password = generate_secure_password()
        password_hash = hash_password(temp_password)

        # Create user
        user = User(
            email=user_data.email,
            password_hash=password_hash,
            full_name=user_data.full_name,
            role=user_data.role,
            status=UserStatus.ACTIVE,
            phone=user_data.phone,
            department=user_data.department,
            hire_date=user_data.hire_date,
        )

        try:
            self.db.add(user)
            self.db.flush()  # Get the user ID without committing

            # Create audit history entry
            history = UserHistory.create_history_entry(
                user_id=user.id,
                action="created",
                changed_fields=["email", "full_name", "role", "status"],
                new_values={
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
                    "status": user.status.value if hasattr(user.status, 'value') else str(user.status),
                    "phone": user.phone,
                    "department": user.department,
                    "hire_date": user.hire_date.isoformat() if user.hire_date else None,
                },
                changed_by=created_by,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            self.db.add(history)
            self.db.commit()

            return user, temp_password

        except IntegrityError:
            self.db.rollback()
            raise UserAlreadyExistsError(f"User with email {user_data.email} already exists")

    def get_user_by_id(self, user_id: int) -> User:
        """
        Get user by ID.

        Args:
            user_id: User ID

        Returns:
            User object

        Raises:
            UserNotFoundError: If user not found
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        return user

    def update_user(
        self,
        user_id: int,
        user_data: UserUpdateRequest,
        updated_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """
        Update user information.

        Args:
            user_id: ID of user to update
            user_data: Updated user data
            updated_by: ID of user making the update
            ip_address: IP address of the updater
            user_agent: User agent of the updater

        Returns:
            Updated user

        Raises:
            UserNotFoundError: If user not found
        """
        user = self.get_user_by_id(user_id)

        # Track what fields are being changed
        changed_fields = []
        old_values = {}
        new_values = {}

        # Update fields that are provided
        if user_data.full_name is not None and user_data.full_name != user.full_name:
            old_values["full_name"] = user.full_name
            new_values["full_name"] = user_data.full_name
            changed_fields.append("full_name")
            user.full_name = user_data.full_name

        if user_data.phone is not None and user_data.phone != user.phone:
            old_values["phone"] = user.phone
            new_values["phone"] = user_data.phone
            changed_fields.append("phone")
            user.phone = user_data.phone

        if user_data.department is not None and user_data.department != user.department:
            old_values["department"] = user.department
            new_values["department"] = user_data.department
            changed_fields.append("department")
            user.department = user_data.department

        if user_data.hire_date is not None and user_data.hire_date != user.hire_date:
            old_values["hire_date"] = user.hire_date.isoformat() if user.hire_date else None
            new_values["hire_date"] = user_data.hire_date.isoformat()
            changed_fields.append("hire_date")
            user.hire_date = user_data.hire_date

        # Only create history entry if something actually changed
        if changed_fields:
            history = UserHistory.create_history_entry(
                user_id=user.id,
                action="updated",
                changed_fields=changed_fields,
                old_values=old_values,
                new_values=new_values,
                changed_by=updated_by,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            self.db.add(history)

        self.db.commit()
        return user

    def change_user_role(
        self,
        user_id: int,
        new_role: UserRole,
        changed_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """
        Change user role with enhanced security checks.

        Args:
            user_id: ID of user to change role
            new_role: New role to assign
            changed_by: ID of user making the change
            ip_address: IP address of the changer
            user_agent: User agent of the changer

        Returns:
            Updated user

        Raises:
            UserNotFoundError: If user not found
            PermissionDeniedError: If trying to change own role
            SecurityViolationError: If security violation detected
        """
        user = self.get_user_by_id(user_id)
        changer = self.get_user_by_id(changed_by)

        # Enhanced security validation
        try:
            validate_user_operation(
                current_user=changer,
                target_user_id=user_id,
                operation="role_change",
                new_role=new_role
            )
        except SecurityViolationError as e:
            # Log security violation attempt
            SecurityLogger.log_privilege_escalation_attempt(
                user_id=changed_by,
                target_user_id=user_id,
                attempted_action=f"role_change_to_{new_role.value}",
                client_info={
                    'ip_address': ip_address or 'unknown',
                    'user_agent': user_agent or 'unknown'
                }
            )
            raise PermissionDeniedError(str(e))

        # Prevent users from changing their own role
        if user_id == changed_by:
            SecurityLogger.log_privilege_escalation_attempt(
                user_id=changed_by,
                target_user_id=user_id,
                attempted_action="self_role_change",
                client_info={
                    'ip_address': ip_address or 'unknown',
                    'user_agent': user_agent or 'unknown'
                }
            )
            raise PermissionDeniedError("Users cannot change their own role")

        if user.role != new_role:
            old_role = user.role
            user.role = new_role

            # Terminate all user sessions when role changes for security
            from app.services.auth_service import AuthService
            auth_service = AuthService(self.db)
            auth_service.logout_all_user_sessions(user_id)

            # Log successful role change for security monitoring
            SecurityLogger.log_security_event(
                event_type="USER_ROLE_CHANGED",
                user_id=changed_by,
                details={
                    "target_user_id": user_id,
                    "old_role": old_role.value,
                    "new_role": new_role.value,
                    "target_user_email": user.email,
                    "sessions_terminated": True
                },
                client_info={
                    'ip_address': ip_address or 'unknown',
                    'user_agent': user_agent or 'unknown'
                },
                severity="INFO"
            )

            # Create audit history entry
            history = UserHistory.create_history_entry(
                user_id=user.id,
                action="role_changed",
                changed_fields=["role"],
                old_values={"role": old_role.value if hasattr(old_role, 'value') else str(old_role)},
                new_values={"role": new_role.value if hasattr(new_role, 'value') else str(new_role)},
                changed_by=changed_by,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            self.db.add(history)
            self.db.commit()

        return user

    def change_user_status(
        self,
        user_id: int,
        new_status: UserStatus,
        changed_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """
        Change user status (activate/deactivate) with enhanced security checks.

        Args:
            user_id: ID of user to change status
            new_status: New status to assign
            changed_by: ID of user making the change
            ip_address: IP address of the changer
            user_agent: User agent of the changer

        Returns:
            Updated user

        Raises:
            UserNotFoundError: If user not found
            PermissionDeniedError: If trying to deactivate own account
            SecurityViolationError: If security violation detected
        """
        user = self.get_user_by_id(user_id)
        changer = self.get_user_by_id(changed_by)

        # Enhanced security validation for deactivation
        if new_status == UserStatus.INACTIVE:
            try:
                validate_user_operation(
                    current_user=changer,
                    target_user_id=user_id,
                    operation="deactivate"
                )
            except SecurityViolationError as e:
                SecurityLogger.log_privilege_escalation_attempt(
                    user_id=changed_by,
                    target_user_id=user_id,
                    attempted_action="self_deactivation",
                    client_info={
                        'ip_address': ip_address or 'unknown',
                        'user_agent': user_agent or 'unknown'
                    }
                )
                raise PermissionDeniedError(str(e))

        # Prevent users from deactivating their own account
        if user_id == changed_by and new_status == UserStatus.INACTIVE:
            SecurityLogger.log_privilege_escalation_attempt(
                user_id=changed_by,
                target_user_id=user_id,
                attempted_action="self_deactivation",
                client_info={
                    'ip_address': ip_address or 'unknown',
                    'user_agent': user_agent or 'unknown'
                }
            )
            raise PermissionDeniedError("Users cannot deactivate their own account")

        if user.status != new_status:
            old_status = user.status
            user.status = new_status

            # Log security event for status change
            SecurityLogger.log_security_event(
                event_type="USER_STATUS_CHANGED",
                user_id=changed_by,
                details={
                    "target_user_id": user_id,
                    "old_status": old_status.value,
                    "new_status": new_status.value,
                    "target_user_email": user.email
                },
                client_info={
                    'ip_address': ip_address or 'unknown',
                    'user_agent': user_agent or 'unknown'
                },
                severity="INFO"
            )

            # If deactivating user, invalidate all their sessions
            if new_status == UserStatus.INACTIVE:
                from app.services.auth_service import AuthService
                auth_service = AuthService(self.db)
                auth_service.logout_all_user_sessions(user_id)

            # Create audit history entry
            action = "activated" if new_status == UserStatus.ACTIVE else "deactivated"
            history = UserHistory.create_history_entry(
                user_id=user.id,
                action=action,
                changed_fields=["status"],
                old_values={"status": old_status.value if hasattr(old_status, 'value') else str(old_status)},
                new_values={"status": new_status.value if hasattr(new_status, 'value') else str(new_status)},
                changed_by=changed_by,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            self.db.add(history)
            self.db.commit()

        return user

    def deactivate_user(
        self,
        user_id: int,
        deactivated_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """
        Deactivate a user (soft delete).

        Args:
            user_id: ID of user to deactivate
            deactivated_by: ID of user performing the deactivation
            ip_address: IP address of the deactivator
            user_agent: User agent of the deactivator

        Raises:
            UserNotFoundError: If user not found
            PermissionDeniedError: If trying to deactivate own account
        """
        self.change_user_status(
            user_id=user_id,
            new_status=UserStatus.INACTIVE,
            changed_by=deactivated_by,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def search_users(self, search_params: UserSearchParams) -> Tuple[List[User], Dict[str, Any]]:
        """
        Search and filter users with pagination.

        Args:
            search_params: Search and filter parameters

        Returns:
            Tuple of (users list, pagination info)
        """
        query = self.db.query(User)

        # Apply search filter
        if search_params.search:
            search_term = f"%{search_params.search}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term),
                )
            )

        # Apply role filter
        if search_params.role:
            query = query.filter(User.role == search_params.role)

        # Apply status filter
        if search_params.status:
            query = query.filter(User.status == search_params.status)

        # Apply date range filter
        if search_params.date_from:
            query = query.filter(User.created_at >= search_params.date_from)

        if search_params.date_to:
            query = query.filter(User.created_at <= search_params.date_to)

        # Apply sorting
        sort_column = getattr(User, search_params.sort_by, User.created_at)
        if search_params.sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Get total count before pagination
        total_items = query.count()

        # Apply pagination
        offset = (search_params.page - 1) * search_params.page_size
        users = query.offset(offset).limit(search_params.page_size).all()

        # Calculate pagination info
        total_pages = (total_items + search_params.page_size - 1) // search_params.page_size
        has_next = search_params.page < total_pages
        has_previous = search_params.page > 1

        pagination_info = {
            "page": search_params.page,
            "page_size": search_params.page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_previous": has_previous,
        }

        return users, pagination_info

    def get_user_history(self, user_id: int) -> List[UserHistory]:
        """
        Get audit history for a user.

        Args:
            user_id: User ID

        Returns:
            List of history entries

        Raises:
            UserNotFoundError: If user not found
        """
        # Verify user exists
        self.get_user_by_id(user_id)

        history = (
            self.db.query(UserHistory)
            .filter(UserHistory.user_id == user_id)
            .order_by(desc(UserHistory.created_at))
            .all()
        )

        return history

    def bulk_user_operation(
        self,
        user_ids: List[int],
        operation: str,
        performed_by: int,
        new_role: Optional[UserRole] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Perform bulk operations on multiple users.

        Args:
            user_ids: List of user IDs to operate on
            operation: Operation to perform (activate, deactivate, change_role, etc.)
            performed_by: ID of user performing the operation
            new_role: New role for role change operations
            ip_address: IP address of the performer
            user_agent: User agent of the performer

        Returns:
            Dictionary with operation results
        """
        results = []
        success_count = 0
        failure_count = 0

        for user_id in user_ids:
            try:
                if operation == "activate":
                    self.change_user_status(
                        user_id=user_id,
                        new_status=UserStatus.ACTIVE,
                        changed_by=performed_by,
                        ip_address=ip_address,
                        user_agent=user_agent,
                    )
                    message = "User activated successfully"

                elif operation == "deactivate":
                    self.change_user_status(
                        user_id=user_id,
                        new_status=UserStatus.INACTIVE,
                        changed_by=performed_by,
                        ip_address=ip_address,
                        user_agent=user_agent,
                    )
                    message = "User deactivated successfully"

                elif operation == "change_role":
                    if not new_role:
                        raise ValueError("new_role is required for role change operation")
                    self.change_user_role(
                        user_id=user_id,
                        new_role=new_role,
                        changed_by=performed_by,
                        ip_address=ip_address,
                        user_agent=user_agent,
                    )
                    message = f"User role changed to {new_role.value if hasattr(new_role, 'value') else str(new_role)} successfully"

                elif operation == "reset_password":
                    # Generate new temporary password
                    temp_password = generate_secure_password()
                    user = self.get_user_by_id(user_id)
                    user.password_hash = hash_password(temp_password)

                    # Create audit history entry
                    history = UserHistory.create_history_entry(
                        user_id=user_id,
                        action="password_reset",
                        changed_fields=["password_hash"],
                        changed_by=performed_by,
                        ip_address=ip_address,
                        user_agent=user_agent,
                    )
                    self.db.add(history)
                    message = f"Password reset successfully. New password: {temp_password}"

                else:
                    raise ValueError(f"Unknown operation: {operation}")

                results.append({
                    "user_id": user_id,
                    "success": True,
                    "message": message,
                })
                success_count += 1

            except (UserNotFoundError, PermissionDeniedError, ValueError) as e:
                results.append({
                    "user_id": user_id,
                    "success": False,
                    "message": str(e),
                })
                failure_count += 1

        self.db.commit()

        return {
            "results": results,
            "success_count": success_count,
            "failure_count": failure_count,
            "total_count": len(user_ids),
        }

    def get_user_access_history(
        self,
        user_id: int,
        days: int = 30,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """
        Get user access history including login/logout events and system activity.

        Args:
            user_id: ID of user to get history for
            days: Number of days to look back (default 30)
            page: Page number for pagination
            page_size: Number of records per page

        Returns:
            Dictionary with access history and metadata
        """
        from datetime import timedelta
        from app.models.user import UserSession

        user = self.get_user_by_id(user_id)
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Get session history
        session_query = (
            self.db.query(UserSession)
            .filter(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.created_at >= start_date,
                    UserSession.created_at <= end_date
                )
            )
            .order_by(desc(UserSession.created_at))
        )
        
        # Get user history (audit trail)
        history_query = (
            self.db.query(UserHistory)
            .filter(
                and_(
                    UserHistory.user_id == user_id,
                    UserHistory.created_at >= start_date,
                    UserHistory.created_at <= end_date
                )
            )
            .order_by(desc(UserHistory.created_at))
        )

        # Apply pagination
        offset = (page - 1) * page_size
        sessions = session_query.offset(offset).limit(page_size).all()
        audit_records = history_query.offset(offset).limit(page_size).all()

        # Combine and sort by timestamp
        access_events = []
        
        for session in sessions:
            access_events.append({
                "type": "session",
                "timestamp": session.created_at.isoformat(),
                "event": "login",
                "ip_address": session.ip_address,
                "user_agent": session.user_agent,
                "session_id": session.session_id[:8] + "...",  # Masked for security
                "expires_at": session.expires_at.isoformat() if session.expires_at else None,
                "is_active": session.expires_at > datetime.utcnow() if session.expires_at else False,
            })
            
        for record in audit_records:
            access_events.append({
                "type": "audit",
                "timestamp": record.created_at.isoformat(),
                "event": record.action,
                "changed_fields": record.changed_fields,
                "ip_address": record.ip_address,
                "user_agent": record.user_agent,
                "changed_by": record.changed_by,
            })

        # Sort by timestamp descending
        access_events.sort(key=lambda x: x["timestamp"], reverse=True)

        # Get total counts
        total_sessions = session_query.count()
        total_audit_records = history_query.count()

        return {
            "user_id": user_id,
            "user_name": user.full_name,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "events": access_events[:page_size],  # Limit to page size
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_events": len(access_events),
                "total_sessions": total_sessions,
                "total_audit_records": total_audit_records,
            }
        }

    def handle_user_deactivation_cascade(
        self,
        user_id: int,
        deactivated_by: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Handle cascade effects when a user is deactivated.

        This includes:
        - Terminating all user sessions
        - Removing user from active assignments
        - Updating related records
        - Creating comprehensive audit trail

        Args:
            user_id: ID of user being deactivated
            deactivated_by: ID of user performing deactivation
            ip_address: IP address of the action
            user_agent: User agent of the action

        Returns:
            Dictionary with details of cascade effects performed
        """
        user = self.get_user_by_id(user_id)
        cascade_effects = []

        try:
            # 1. Terminate all user sessions
            from app.services.auth_service import AuthService
            auth_service = AuthService(self.db)
            session_count = auth_service.logout_all_user_sessions(user_id)
            cascade_effects.append({
                "type": "sessions_terminated",
                "count": session_count,
                "description": f"Terminated {session_count} active sessions"
            })

            # 2. Remove user from active project assignments (if applicable)
            # Note: This would be implemented when project/assignment tables exist
            # For now, we'll log this as a placeholder
            cascade_effects.append({
                "type": "assignments_reviewed",
                "count": 0,
                "description": "User removed from active project assignments (placeholder)"
            })

            # 3. Update user status
            old_status = user.status
            user.status = UserStatus.INACTIVE
            cascade_effects.append({
                "type": "status_updated",
                "old_status": old_status.value if hasattr(old_status, 'value') else str(old_status),
                "new_status": UserStatus.INACTIVE.value,
                "description": "User status changed to inactive"
            })

            # 4. Create comprehensive audit trail entry
            history = UserHistory.create_history_entry(
                user_id=user.id,
                action="deactivated_with_cascade",
                changed_fields=["status"],
                old_values={"status": old_status.value if hasattr(old_status, 'value') else str(old_status)},
                new_values={"status": UserStatus.INACTIVE.value},
                changed_by=deactivated_by,
                ip_address=ip_address,
                user_agent=user_agent
            )
            self.db.add(history)

            # 5. Log security event
            SecurityLogger.log_security_event(
                event_type="USER_DEACTIVATED_WITH_CASCADE",
                user_id=deactivated_by,
                details={
                    "target_user_id": user_id,
                    "target_user_email": user.email,
                    "cascade_effects": cascade_effects,
                    "sessions_terminated": session_count,
                },
                client_info={
                    'ip_address': ip_address or 'unknown',
                    'user_agent': user_agent or 'unknown'
                },
                severity="INFO"
            )

            self.db.commit()

            return {
                "success": True,
                "user_id": user_id,
                "user_name": user.full_name,
                "cascade_effects": cascade_effects,
                "total_effects": len(cascade_effects),
                "deactivated_at": datetime.utcnow().isoformat(),
                "deactivated_by": deactivated_by,
            }

        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to handle deactivation cascade: {str(e)}")

    def export_audit_trail(
        self,
        user_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        actions: Optional[List[str]] = None,
        export_format: str = "csv",
    ) -> str:
        """
        Export audit trail data for reporting and compliance.

        Args:
            user_id: Optional user ID to filter by
            start_date: Optional start date for filtering
            end_date: Optional end date for filtering
            actions: Optional list of actions to filter by
            export_format: Export format ('csv' or 'json')

        Returns:
            String containing exported data
        """
        import csv
        import json
        from io import StringIO

        # Build query
        query = self.db.query(UserHistory)
        
        filters = []
        if user_id:
            filters.append(UserHistory.user_id == user_id)
        if start_date:
            filters.append(UserHistory.created_at >= start_date)
        if end_date:
            filters.append(UserHistory.created_at <= end_date)
        if actions:
            filters.append(UserHistory.action.in_(actions))

        if filters:
            query = query.filter(and_(*filters))

        # Get records
        records = query.order_by(desc(UserHistory.created_at)).all()

        # Prepare data for export
        export_data = []
        for record in records:
            export_data.append({
                "id": record.id,
                "user_id": record.user_id,
                "action": record.action,
                "changed_fields": record.changed_fields,
                "old_values": record.old_values,
                "new_values": record.new_values,
                "changed_by": record.changed_by,
                "created_at": record.created_at.isoformat(),
                "ip_address": record.ip_address,
                "user_agent": record.user_agent,
            })

        # Export based on format
        if export_format.lower() == "json":
            return json.dumps(export_data, indent=2)
        
        elif export_format.lower() == "csv":
            output = StringIO()
            if export_data:
                fieldnames = export_data[0].keys()
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                for row in export_data:
                    # Convert complex fields to strings for CSV
                    csv_row = row.copy()
                    for key, value in csv_row.items():
                        if isinstance(value, (dict, list)):
                            csv_row[key] = json.dumps(value)
                    writer.writerow(csv_row)
            return output.getvalue()
        
        else:
            raise ValueError(f"Unsupported export format: {export_format}")

    def cleanup_audit_trail(
        self,
        retention_days: int = 365,
        batch_size: int = 1000,
    ) -> Dict[str, Any]:
        """
        Clean up old audit trail records based on retention policy.

        Args:
            retention_days: Number of days to retain audit records
            batch_size: Number of records to delete per batch

        Returns:
            Dictionary with cleanup results
        """
        from datetime import timedelta

        # Calculate cutoff date
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # Count records to be deleted
        total_count = (
            self.db.query(UserHistory)
            .filter(UserHistory.created_at < cutoff_date)
            .count()
        )

        if total_count == 0:
            return {
                "success": True,
                "message": "No records to clean up",
                "records_deleted": 0,
                "cutoff_date": cutoff_date.isoformat(),
                "retention_days": retention_days,
            }

        # Delete in batches to avoid long-running transactions
        deleted_count = 0
        while True:
            # Get batch of records to delete
            batch = (
                self.db.query(UserHistory)
                .filter(UserHistory.created_at < cutoff_date)
                .limit(batch_size)
                .all()
            )
            
            if not batch:
                break
                
            # Delete batch
            for record in batch:
                self.db.delete(record)
            
            self.db.commit()
            deleted_count += len(batch)

        # Log cleanup operation
        SecurityLogger.log_security_event(
            event_type="AUDIT_TRAIL_CLEANUP",
            user_id=None,  # System operation
            details={
                "retention_days": retention_days,
                "cutoff_date": cutoff_date.isoformat(),
                "records_deleted": deleted_count,
                "total_records_found": total_count,
            },
            client_info={
                'ip_address': 'system',
                'user_agent': 'system_cleanup'
            },
            severity="INFO"
        )

        return {
            "success": True,
            "message": f"Successfully cleaned up {deleted_count} audit records",
            "records_deleted": deleted_count,
            "total_records_found": total_count,
            "cutoff_date": cutoff_date.isoformat(),
            "retention_days": retention_days,
        }
