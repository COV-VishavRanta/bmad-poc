"""
Tests for client management functionality.

This module contains unit tests for client models, services, and API endpoints,
including CRUD operations, validation, and audit trail functionality.
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.client import Client, ClientHistory, ClientType, ClientStatus, HistoryAction
from app.models.user import User, UserRole
from app.schemas.client import ClientCreate, ClientUpdate, ClientSearchParams
from app.services.client_service import ClientService


class TestClientModel:
    """Test cases for Client model."""

    def test_client_creation(self, db_session: Session, sample_hr_user: User):
        """Test client model creation."""
        client = Client(
            name="Test Corp",
            client_type=ClientType.CUSTOMER.value,
            status=ClientStatus.ACTIVE.value,
            relation_type="Direct Customer",
            project_mgmt_tool="Jira",
            comments="Test client for unit testing",
            created_by=sample_hr_user.id
        )
        
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
        
        assert client.id is not None
        assert client.name == "Test Corp"
        assert client.client_type == ClientType.CUSTOMER.value
        assert client.status == ClientStatus.ACTIVE.value
        assert client.is_active is True
        assert client.can_be_deleted() is True

    def test_client_history_creation(self, db_session: Session, sample_client: Client, sample_hr_user: User):
        """Test client history model creation."""
        history = ClientHistory(
            client_id=sample_client.id,
            action=HistoryAction.CREATE.value,
            old_values=None,
            new_values={"name": "Test Client", "status": "Active"},
            changed_by=sample_hr_user.id
        )
        
        db_session.add(history)
        db_session.commit()
        db_session.refresh(history)
        
        assert history.id is not None
        assert history.client_id == sample_client.id
        assert history.action == HistoryAction.CREATE.value
        assert history.changed_by == sample_hr_user.id


class TestClientService:
    """Test cases for ClientService."""

    def test_create_client_success(self, db_session: Session, sample_hr_user: User):
        """Test successful client creation."""
        service = ClientService(db_session)
        client_data = ClientCreate(
            name="New Test Client",
            client_type=ClientType.PARTNER,
            status=ClientStatus.ACTIVE,
            relation_type="Strategic Partner",
            project_mgmt_tool="Asana",
            comments="New partner for collaboration"
        )
        
        result = service.create_client(client_data, sample_hr_user)
        
        assert result.name == "New Test Client"
        assert result.client_type == ClientType.PARTNER
        assert result.created_by == sample_hr_user.id
        
        # Verify audit history was created
        history = db_session.query(ClientHistory).filter(
            ClientHistory.client_id == result.id
        ).first()
        assert history is not None
        assert history.action == HistoryAction.CREATE.value

    def test_create_client_permission_denied(self, db_session: Session, sample_pc_user: User):
        """Test client creation with insufficient permissions."""
        service = ClientService(db_session)
        client_data = ClientCreate(
            name="Unauthorized Client",
            client_type=ClientType.CUSTOMER,
            status=ClientStatus.ACTIVE,
            relation_type="Test Relation"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            service.create_client(client_data, sample_pc_user)
        
        assert exc_info.value.status_code == 403
        assert "Insufficient permissions" in exc_info.value.detail

    def test_create_client_duplicate_name(self, db_session: Session, sample_hr_user: User, sample_client: Client):
        """Test client creation with duplicate name."""
        service = ClientService(db_session)
        client_data = ClientCreate(
            name=sample_client.name,  # Duplicate name
            client_type=ClientType.CUSTOMER,
            status=ClientStatus.ACTIVE,
            relation_type="Test Relation"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            service.create_client(client_data, sample_hr_user)
        
        assert exc_info.value.status_code == 409
        assert "already exists" in exc_info.value.detail

    def test_get_client_success(self, db_session: Session, sample_hr_user: User, sample_client: Client):
        """Test successful client retrieval."""
        service = ClientService(db_session)
        
        result = service.get_client(sample_client.id, sample_hr_user)
        
        assert result.id == sample_client.id
        assert result.name == sample_client.name

    def test_get_client_not_found(self, db_session: Session, sample_hr_user: User):
        """Test client retrieval with non-existent ID."""
        service = ClientService(db_session)
        
        with pytest.raises(HTTPException) as exc_info:
            service.get_client(99999, sample_hr_user)
        
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail

    def test_list_clients_success(self, db_session: Session, sample_hr_user: User, sample_clients: list):
        """Test successful client listing."""
        service = ClientService(db_session)
        params = ClientSearchParams(page=1, limit=10)
        
        result = service.list_clients(params, sample_hr_user)
        
        assert len(result.clients) <= 10
        assert result.total >= 0
        assert result.page == 1

    def test_list_clients_with_search(self, db_session: Session, sample_hr_user: User, sample_clients: list):
        """Test client listing with search filter."""
        service = ClientService(db_session)
        params = ClientSearchParams(page=1, limit=10, search="Test")
        
        result = service.list_clients(params, sample_hr_user)
        
        # All returned clients should match the search
        for client in result.clients:
            assert "Test" in client.name or "Test" in (client.comments or "")

    def test_update_client_success(self, db_session: Session, sample_hr_user: User, sample_client: Client):
        """Test successful client update."""
        service = ClientService(db_session)
        update_data = ClientUpdate(
            name="Updated Client Name",
            comments="Updated comments"
        )
        
        result = service.update_client(sample_client.id, update_data, sample_hr_user)
        
        assert result.name == "Updated Client Name"
        assert result.comments == "Updated comments"
        assert result.updated_by == sample_hr_user.id
        
        # Verify audit history was created
        history = db_session.query(ClientHistory).filter(
            ClientHistory.client_id == sample_client.id,
            ClientHistory.action == HistoryAction.UPDATE.value
        ).first()
        assert history is not None

    def test_delete_client_success(self, db_session: Session, sample_hr_user: User, sample_client: Client):
        """Test successful client deletion."""
        service = ClientService(db_session)
        client_id = sample_client.id
        
        result = service.delete_client(client_id, sample_hr_user)
        
        assert "deleted successfully" in result["message"]
        
        # Verify client is deleted
        deleted_client = db_session.query(Client).filter(Client.id == client_id).first()
        assert deleted_client is None
        
        # Verify audit history was created
        history = db_session.query(ClientHistory).filter(
            ClientHistory.client_id == client_id,
            ClientHistory.action == HistoryAction.DELETE.value
        ).first()
        assert history is not None

    def test_deactivate_client_success(self, db_session: Session, sample_hr_user: User, sample_client: Client):
        """Test successful client deactivation."""
        service = ClientService(db_session)
        
        result = service.deactivate_client(sample_client.id, sample_hr_user)
        
        assert result.status == ClientStatus.INACTIVE
        
        # Verify client is deactivated in database
        updated_client = db_session.query(Client).filter(Client.id == sample_client.id).first()
        assert updated_client.status == ClientStatus.INACTIVE.value


class TestClientAPI:
    """Test cases for Client API endpoints."""

    def test_create_client_api(self, client: TestClient, auth_token: str):
        """Test client creation API endpoint."""
        client_data = {
            "name": "API Test Client",
            "client_type": "Customer",
            "status": "Active",
            "relation_type": "API Test Relation",
            "project_mgmt_tool": "Trello",
            "comments": "Created via API test"
        }
        
        response = client.post(
            "/api/clients/",
            json=client_data,
            cookies={"session_token": auth_token}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "API Test Client"
        assert data["client_type"] == "Customer"

    def test_list_clients_api(self, client: TestClient, auth_token: str):
        """Test client listing API endpoint."""
        response = client.get(
            "/api/clients/?page=1&limit=10",
            cookies={"session_token": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "clients" in data
        assert "total" in data
        assert "page" in data

    def test_get_client_api(self, client: TestClient, auth_token: str, sample_client_id: int):
        """Test client retrieval API endpoint."""
        response = client.get(
            f"/api/clients/{sample_client_id}",
            cookies={"session_token": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_client_id

    def test_update_client_api(self, client: TestClient, auth_token: str, sample_client_id: int):
        """Test client update API endpoint."""
        update_data = {
            "name": "Updated via API",
            "comments": "Updated through API test"
        }
        
        response = client.put(
            f"/api/clients/{sample_client_id}",
            json=update_data,
            cookies={"session_token": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated via API"

    def test_delete_client_api(self, client: TestClient, auth_token: str, sample_client_id: int):
        """Test client deletion API endpoint."""
        response = client.delete(
            f"/api/clients/{sample_client_id}",
            cookies={"session_token": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "deleted successfully" in data["message"]

    def test_unauthorized_access(self):
        """Test API access without authentication."""
        from main import app
        from app.utils.middleware import require_auth
        from fastapi.testclient import TestClient
        
        # Temporarily remove the auth override for this test
        auth_override = app.dependency_overrides.pop(require_auth, None)
        
        try:
            test_client = TestClient(app)
            response = test_client.get("/api/clients/")
            assert response.status_code == 401
        finally:
            # Restore the auth override
            if auth_override:
                app.dependency_overrides[require_auth] = auth_override