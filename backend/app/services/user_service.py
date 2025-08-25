"""
User service for managing user operations.

This module provides business logic for user management,
including creation, authentication, and session handling.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.user import User, UserSession
from app.schemas.user import UserCreate, UserUpdate
from app.utils.auth import PasswordHash, SessionManager
from app.exceptions import UserAlreadyExistsError, UserNotFoundError, InvalidCredentialsError


class UserService:
    """Service class for user management operations."""

    def __init__(self, db: Session):
        """
        Initialize user service with database session.
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create_user(self, user_data: UserCreate) -> User:
        """
        Create a new user.
        
        Args:
            user_data: User creation data
            
        Returns:
            Created user object
            
        Raises:
            UserAlreadyExistsError: If user with email already exists
        """
        # Hash the password
        hashed_password = PasswordHash.hash_password(user_data.password)
        
        # Create user object
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role,
            is_active=user_data.is_active
        )
        
        try:
            self.db.add(db_user)
            self.db.commit()
            self.db.refresh(db_user)
            return db_user
        except IntegrityError:
            self.db.rollback()
            raise UserAlreadyExistsError(f"User with email {user_data.email} already exists")

    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.
        
        Args:
            email: User email address
            
        Returns:
            User object if found, None otherwise
        """
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User object if found, None otherwise
        """
        return self.db.query(User).filter(User.id == user_id).first()

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate user with email and password.
        
        Args:
            email: User email address
            password: Plain text password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user = self.get_user_by_email(email)
        if not user or not user.is_active:
            return None
            
        if not PasswordHash.verify_password(password, user.password_hash):
            return None
            
        return user

    def create_user_session(self, user: User) -> UserSession:
        """
        Create a new session for user.
        
        Args:
            user: User object
            
        Returns:
            Created session object
        """
        # Generate session token and expiry
        session_token = SessionManager.generate_session_token()
        expires_at = SessionManager.create_session_expiry(hours=24)
        
        # Create session object
        session = UserSession(
            user_id=user.id,
            session_token=session_token,
            expires_at=expires_at
        )
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        return session

    def get_session_by_token(self, session_token: str) -> Optional[UserSession]:
        """
        Get session by token.
        
        Args:
            session_token: Session token string
            
        Returns:
            Session object if found and valid, None otherwise
        """
        session = self.db.query(UserSession).filter(
            UserSession.session_token == session_token
        ).first()
        
        if not session or session.is_expired:
            return None
            
        return session

    def invalidate_session(self, session_token: str) -> bool:
        """
        Invalidate a user session.
        
        Args:
            session_token: Session token to invalidate
            
        Returns:
            True if session was invalidated, False if not found
        """
        session = self.db.query(UserSession).filter(
            UserSession.session_token == session_token
        ).first()
        
        if session:
            self.db.delete(session)
            self.db.commit()
            return True
            
        return False

    def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired sessions from database.
        
        Returns:
            Number of sessions cleaned up
        """
        expired_sessions = self.db.query(UserSession).filter(
            UserSession.expires_at < datetime.utcnow()
        ).all()
        
        count = len(expired_sessions)
        for session in expired_sessions:
            self.db.delete(session)
            
        self.db.commit()
        return count