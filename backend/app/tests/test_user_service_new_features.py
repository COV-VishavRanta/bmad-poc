"""
Tests for the new user management features: access history, cascade effects, and audit export.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from app.models.user import User, UserRole, UserStatus, UserSession
from app.models.user_history import UserHistory
from app.services.user_service import UserService, UserNotFoundError


class TestUserServiceNewFeatures:
    """Test class for new user management features."""

    def test_get_user_access_history_success(self, db_session, test_hr_user, test_pc_user):
        """Test successful retrieval of user access history."""
        user_service = UserService(db_session)
        
        # Create some test sessions
        user = test_hr_user
        session1 = UserSession(
            user_id=user.id,
            session_id="test_session_1",
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
            created_at=datetime.utcnow() - timedelta(days=1),
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        session2 = UserSession(
            user_id=user.id,
            session_id="test_session_2",
            ip_address="192.168.1.2",
            user_agent="TestAgent/2.0",
            created_at=datetime.utcnow() - timedelta(days=2),
            expires_at=datetime.utcnow() + timedelta(hours=12)
        )
        
        db_session.add(session1)
        db_session.add(session2)
        db_session.commit()
        
        # Create some audit history
        history1 = UserHistory.create_history_entry(
            user_id=user.id,
            action="role_changed",
            changed_fields=["role"],
            old_values={"role": "PC"},
            new_values={"role": "HR"},
            changed_by=test_pc_user.id,
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0"
        )
        db_session.add(history1)
        db_session.commit()
        
        # Test the access history retrieval
        result = user_service.get_user_access_history(user.id, days=30, page=1, page_size=50)
        
        assert result["user_id"] == user.id
        assert result["user_name"] == user.full_name
        assert len(result["events"]) > 0
        assert result["pagination"]["total_sessions"] == 2
        assert result["pagination"]["total_audit_records"] == 1

    def test_get_user_access_history_not_found(self, db_session):
        """Test access history retrieval for non-existent user."""
        user_service = UserService(db_session)
        
        with pytest.raises(UserNotFoundError):
            user_service.get_user_access_history(999, days=30)

    @patch('app.services.auth_service.AuthService')
    def test_handle_user_deactivation_cascade(self, mock_auth_service, db_session, test_hr_user, test_pc_user):
        """Test user deactivation with cascade effects."""
        user_service = UserService(db_session)
        
        # Mock the auth service
        mock_auth_instance = MagicMock()
        mock_auth_instance.logout_all_user_sessions.return_value = 3
        mock_auth_service.return_value = mock_auth_instance
        
        user = test_hr_user
        deactivated_by = test_pc_user.id
        
        result = user_service.handle_user_deactivation_cascade(
            user_id=user.id,
            deactivated_by=deactivated_by,
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0"
        )
        
        # Verify result structure
        assert result["success"] is True
        assert result["user_id"] == user.id
        assert result["user_name"] == user.full_name
        assert len(result["cascade_effects"]) > 0
        
        # Verify sessions were terminated
        mock_auth_instance.logout_all_user_sessions.assert_called_once_with(user.id)
        
        # Verify user status was changed
        db_session.refresh(user)
        assert user.status == UserStatus.INACTIVE
        
        # Verify audit trail was created
        history = db_session.query(UserHistory).filter(
            UserHistory.user_id == user.id,
            UserHistory.action == "deactivated_with_cascade"
        ).first()
        assert history is not None
        assert history.changed_by == deactivated_by

    def test_export_audit_trail_csv(self, db_session, test_hr_user):
        """Test audit trail export in CSV format."""
        user_service = UserService(db_session)
        
        user = test_hr_user
        
        # Create some audit records
        history1 = UserHistory.create_history_entry(
            user_id=user.id,
            action="role_changed",
            changed_fields=["role"],
            old_values={"role": "PC"},
            new_values={"role": "HR"},
            changed_by=2,
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0"
        )
        
        history2 = UserHistory.create_history_entry(
            user_id=user.id,
            action="updated",
            changed_fields=["phone"],
            old_values={"phone": "555-0001"},
            new_values={"phone": "555-0002"},
            changed_by=1,
            ip_address="192.168.1.2",
            user_agent="TestAgent/2.0"
        )
        
        db_session.add(history1)
        db_session.add(history2)
        db_session.commit()
        
        # Export as CSV
        csv_data = user_service.export_audit_trail(
            user_id=user.id,
            export_format="csv"
        )
        
        assert isinstance(csv_data, str)
        assert "id,user_id,action" in csv_data  # CSV header
        assert "role_changed" in csv_data
        assert "updated" in csv_data

    def test_export_audit_trail_json(self, db_session, test_hr_user):
        """Test audit trail export in JSON format."""
        user_service = UserService(db_session)
        
        user = test_hr_user
        
        # Create an audit record
        history = UserHistory.create_history_entry(
            user_id=user.id,
            action="status_changed",
            changed_fields=["status"],
            old_values={"status": "active"},
            new_values={"status": "inactive"},
            changed_by=2,
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0"
        )
        
        db_session.add(history)
        db_session.commit()
        
        # Export as JSON
        json_data = user_service.export_audit_trail(
            user_id=user.id,
            export_format="json"
        )
        
        import json
        parsed_data = json.loads(json_data)
        
        assert isinstance(parsed_data, list)
        assert len(parsed_data) == 1
        assert parsed_data[0]["action"] == "status_changed"
        assert parsed_data[0]["user_id"] == user.id

    def test_export_audit_trail_with_filters(self, db_session, test_hr_user):
        """Test audit trail export with date and action filters."""
        user_service = UserService(db_session)
        
        user = test_hr_user
        
        # Create audit records with different dates and actions
        old_date = datetime.utcnow() - timedelta(days=10)
        recent_date = datetime.utcnow() - timedelta(hours=1)
        
        # Old record that should be filtered out
        history1 = UserHistory.create_history_entry(
            user_id=user.id,
            action="old_action",
            changed_fields=["field1"],
            changed_by=1
        )
        history1.created_at = old_date
        
        # Recent record that should be included
        history2 = UserHistory.create_history_entry(
            user_id=user.id,
            action="role_changed",
            changed_fields=["role"],
            changed_by=1
        )
        history2.created_at = recent_date
        
        db_session.add(history1)
        db_session.add(history2)
        db_session.commit()
        
        # Export with date filter
        start_date = datetime.utcnow() - timedelta(days=1)
        json_data = user_service.export_audit_trail(
            user_id=user.id,
            start_date=start_date,
            actions=["role_changed"],
            export_format="json"
        )
        
        import json
        parsed_data = json.loads(json_data)
        
        assert len(parsed_data) == 1
        assert parsed_data[0]["action"] == "role_changed"

    def test_cleanup_audit_trail(self, db_session, test_hr_user):
        """Test audit trail cleanup functionality."""
        user_service = UserService(db_session)
        
        user = test_hr_user
        
        # Create old and new audit records
        old_date = datetime.utcnow() - timedelta(days=400)  # Older than 365 days
        recent_date = datetime.utcnow() - timedelta(days=30)  # Within 365 days
        
        # Old record that should be deleted
        old_history = UserHistory.create_history_entry(
            user_id=user.id,
            action="old_action",
            changed_fields=["field1"],
            changed_by=1
        )
        old_history.created_at = old_date
        
        # Recent record that should be kept
        recent_history = UserHistory.create_history_entry(
            user_id=user.id,
            action="recent_action",
            changed_fields=["field2"],
            changed_by=1
        )
        recent_history.created_at = recent_date
        
        db_session.add(old_history)
        db_session.add(recent_history)
        db_session.commit()
        
        # Count records before cleanup
        total_before = db_session.query(UserHistory).count()
        assert total_before == 2
        
        # Perform cleanup with 365 days retention
        result = user_service.cleanup_audit_trail(retention_days=365, batch_size=10)
        
        # Verify results
        assert result["success"] is True
        assert result["records_deleted"] == 1
        assert result["retention_days"] == 365
        
        # Verify only recent record remains
        remaining_records = db_session.query(UserHistory).all()
        assert len(remaining_records) == 1
        assert remaining_records[0].action == "recent_action"

    def test_cleanup_audit_trail_no_records(self, db_session):
        """Test audit trail cleanup when no old records exist."""
        user_service = UserService(db_session)
        
        result = user_service.cleanup_audit_trail(retention_days=365)
        
        assert result["success"] is True
        assert result["records_deleted"] == 0
        assert "No records to clean up" in result["message"]

    def test_export_audit_trail_invalid_format(self, db_session):
        """Test audit trail export with invalid format."""
        user_service = UserService(db_session)
        
        with pytest.raises(ValueError, match="Unsupported export format"):
            user_service.export_audit_trail(export_format="xml")

    @patch('app.services.auth_service.AuthService')
    def test_role_change_with_session_termination(self, mock_auth_service, db_session, test_hr_user, test_pc_user):
        """Test that role changes now terminate user sessions."""
        user_service = UserService(db_session)
        
        # Mock the auth service
        mock_auth_instance = MagicMock()
        mock_auth_instance.logout_all_user_sessions.return_value = 2
        mock_auth_service.return_value = mock_auth_instance
        
        user = test_hr_user
        changed_by = test_pc_user.id
        
        # Change user role
        user_service.change_user_role(
            user_id=user.id,
            new_role=UserRole.RM,
            changed_by=changed_by,
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0"
        )
        
        # Verify sessions were terminated
        mock_auth_instance.logout_all_user_sessions.assert_called_once_with(user.id)
        
        # Verify role was changed
        db_session.refresh(user)
        assert user.role == UserRole.RM