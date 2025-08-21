"""
Tests for client API endpoints.

This module contains comprehensive tests for client CRUD operations,
search/filtering, contact management, and audit trail functionality.
"""

import pytest
from datetime import datetime
from fastapi import status

from app.models.client import Client, ClientContact, ClientStatus, RelationType
from app.models.project import Project


class TestClientCRUD:
    """Test client CRUD operations."""

    def test_create_client_success(self, hr_client):
        """Test successful client creation."""
        client_data = {
            "name": "Test Client",
            "status": "active",
            "relation_type": "Customer",
            "project_management_tool": "Jira",
            "comments": "Test comments",
        }
        
        response = hr_client.post("/api/clients/", json=client_data)
        
        # Debug the response
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.content}")
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Test Client"
        assert data["status"] == "active"
        assert data["relation_type"] == "Customer"
        assert data["project_management_tool"] == "Jira"
        assert data["comments"] == "Test comments"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_client_duplicate_name(self, hr_client, db_session):
        """Test client creation with duplicate name."""
        # Create first client
        client = Client(
            name="Duplicate Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        # Try to create client with same name
        client_data = {
            "name": "Duplicate Client",
            "status": "active",
            "relation_type": "Customer",
        }
        
        response = hr_client.post("/api/clients/", json=client_data)
        
        assert response.status_code == status.HTTP_409_CONFLICT
        data = response.json()
        
        # Handle the actual error response structure
        if "error" in data:
            error_detail = data["error"]["message"]
            assert error_detail["status"] == "error"
            assert "already exists" in error_detail["message"]
        elif "detail" in data:
            detail = data["detail"]
            assert detail["status"] == "error"
            assert "already exists" in detail["message"]
        else:
            # Direct structure
            assert data["status"] == "error"
            assert "already exists" in data["message"]

    def test_create_client_validation_error(self, hr_client):
        """Test client creation with validation errors."""
        client_data = {
            "name": "",  # Empty name
            "status": "invalid_status",
            "relation_type": "Invalid Type",
        }
        
        response = hr_client.post("/api/clients/", json=client_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_client_success(self, hr_client, db_session):
        """Test successful client retrieval."""
        # Create test client
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        response = hr_client.get(f"/api/clients/{client.id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == client.id
        assert data["name"] == "Test Client"
        assert data["status"] == "active"
        assert data["relation_type"] == "Customer"

    def test_get_client_not_found(self, hr_client):
        """Test client retrieval for non-existent client."""
        response = hr_client.get("/api/clients/99999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        
        # Handle the actual error response structure
        if "error" in data:
            error_detail = data["error"]["message"]
            assert error_detail["status"] == "error"
            assert "not found" in error_detail["message"]
        elif "detail" in data:
            detail = data["detail"]
            assert detail["status"] == "error"
            assert "not found" in detail["message"]
        else:
            # Direct structure
            assert data["status"] == "error"
            assert "not found" in data["message"]

    def test_update_client_success(self, hr_client, db_session):
        """Test successful client update."""
        # Create test client
        client = Client(
            name="Original Name",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        update_data = {
            "name": "Updated Name",
            "status": "inactive",
            "comments": "Updated comments",
        }
        
        response = hr_client.put(f"/api/clients/{client.id}", json=update_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["status"] == "inactive"
        assert data["comments"] == "Updated comments"

    def test_update_client_duplicate_name(self, hr_client, db_session):
        """Test client update with duplicate name."""
        # Create two clients
        client1 = Client(
            name="Client 1",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        client2 = Client(
            name="Client 2",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add_all([client1, client2])
        db_session.commit()
        
        # Try to update client2 with client1's name
        update_data = {"name": "Client 1"}
        
        response = hr_client.put(f"/api/clients/{client2.id}", json=update_data)
        
        assert response.status_code == status.HTTP_409_CONFLICT

    def test_delete_client_success(self, hr_client, db_session):
        """Test successful client deletion."""
        # Create test client
        client = Client(
            name="Client to Delete",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        response = hr_client.delete(f"/api/clients/{client.id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "deleted successfully" in data["message"]

    def test_delete_client_not_found(self, hr_client):
        """Test deletion of non-existent client."""
        response = hr_client.delete("/api/clients/99999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestClientSearch:
    """Test client search and filtering functionality."""

    def setup_test_clients(self, db_session):
        """Create test clients for search tests."""
        clients = [
            Client(
                name="Acme Corporation",
                status=ClientStatus.ACTIVE,
                relation_type=RelationType.CUSTOMER,
                comments="Important customer",
            ),
            Client(
                name="Tech Partners Inc",
                status=ClientStatus.ACTIVE,
                relation_type=RelationType.PARTNER,
                comments="Technology partner",
            ),
            Client(
                name="Internal Department",
                status=ClientStatus.INACTIVE,
                relation_type=RelationType.INTERNAL,
                comments="Internal testing",
            ),
        ]
        db_session.add_all(clients)
        db_session.commit()
        return clients

    def test_list_all_clients(self, hr_client, db_session):
        """Test listing all clients without filters."""
        self.setup_test_clients(db_session)
        
        response = hr_client.get("/api/clients/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 3
        assert len(data["clients"]) == 3
        assert data["page"] == 1
        assert data["page_size"] == 20

    def test_search_clients_by_name(self, hr_client, db_session):
        """Test searching clients by name."""
        self.setup_test_clients(db_session)
        
        response = hr_client.get("/api/clients/?search=Acme")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["clients"][0]["name"] == "Acme Corporation"

    def test_filter_clients_by_status(self, hr_client, db_session):
        """Test filtering clients by status."""
        self.setup_test_clients(db_session)
        
        response = hr_client.get("/api/clients/?status=active")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 2
        for client in data["clients"]:
            assert client["status"] == "active"

    def test_filter_clients_by_relation_type(self, hr_client, db_session):
        """Test filtering clients by relation type."""
        self.setup_test_clients(db_session)
        
        response = hr_client.get("/api/clients/?relation_type=Customer")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["clients"][0]["relation_type"] == "Customer"

    def test_pagination(self, hr_client, db_session):
        """Test client pagination."""
        # Create 25 clients
        clients = [
            Client(
                name=f"Client {i}",
                status=ClientStatus.ACTIVE,
                relation_type=RelationType.CUSTOMER,
            )
            for i in range(25)
        ]
        db_session.add_all(clients)
        db_session.commit()
        
        # Test first page
        response = hr_client.get("/api/clients/?page=1&page_size=10")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 25
        assert len(data["clients"]) == 10
        assert data["page"] == 1
        assert data["pages"] == 3

    def test_sorting(self, hr_client, db_session):
        """Test client sorting."""
        # Create clients with different names
        clients = [
            Client(name="Zebra Corp", status=ClientStatus.ACTIVE, relation_type=RelationType.CUSTOMER),
            Client(name="Alpha Inc", status=ClientStatus.ACTIVE, relation_type=RelationType.CUSTOMER),
            Client(name="Beta LLC", status=ClientStatus.ACTIVE, relation_type=RelationType.CUSTOMER),
        ]
        db_session.add_all(clients)
        db_session.commit()
        
        # Test ascending sort
        response = hr_client.get("/api/clients/?sort_by=name&sort_order=asc")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        names = [client["name"] for client in data["clients"]]
        assert names == ["Alpha Inc", "Beta LLC", "Zebra Corp"]
        
        # Test descending sort
        response = hr_client.get("/api/clients/?sort_by=name&sort_order=desc")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        names = [client["name"] for client in data["clients"]]
        assert names == ["Zebra Corp", "Beta LLC", "Alpha Inc"]


class TestClientContacts:
    """Test client contact management."""

    def test_create_contact_success(self, hr_client, db_session):
        """Test successful contact creation."""
        # Create test client
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        contact_data = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "555-123-4567",
            "role": "Project Manager",
            "is_primary": True,
        }
        
        response = hr_client.post(f"/api/clients/{client.id}/contacts", json=contact_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "John Doe"
        assert data["email"] == "john@example.com"
        assert data["phone"] == "555-123-4567"
        assert data["role"] == "Project Manager"
        assert data["is_primary"] is True
        assert data["client_id"] == client.id

    def test_get_client_contacts(self, hr_client, db_session):
        """Test retrieving client contacts."""
        # Create test client and contacts
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.flush()
        
        contacts = [
            ClientContact(
                client_id=client.id,
                name="John Doe",
                email="john@example.com",
                is_primary=True,
            ),
            ClientContact(
                client_id=client.id,
                name="Jane Smith",
                email="jane@example.com",
                is_primary=False,
            ),
        ]
        db_session.add_all(contacts)
        db_session.commit()
        
        response = hr_client.get(f"/api/clients/{client.id}/contacts")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
        # Primary contact should be first
        assert data[0]["is_primary"] is True
        assert data[0]["name"] == "John Doe"

    def test_update_contact_success(self, hr_client, db_session):
        """Test successful contact update."""
        # Create test client and contact
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.flush()
        
        contact = ClientContact(
            client_id=client.id,
            name="Original Name",
            email="original@example.com",
        )
        db_session.add(contact)
        db_session.commit()
        
        update_data = {
            "name": "Updated Name",
            "email": "updated@example.com",
            "role": "New Role",
        }
        
        response = hr_client.put(
            f"/api/clients/{client.id}/contacts/{contact.id}",
            json=update_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["email"] == "updated@example.com"
        assert data["role"] == "New Role"

    def test_delete_contact_success(self, hr_client, db_session):
        """Test successful contact deletion."""
        # Create test client and contact
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.flush()
        
        contact = ClientContact(
            client_id=client.id,
            name="Contact to Delete",
            email="delete@example.com",
        )
        db_session.add(contact)
        db_session.commit()
        
        response = hr_client.delete(f"/api/clients/{client.id}/contacts/{contact.id}")
        
        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestClientHistory:
    """Test client audit trail functionality."""

    def test_get_client_history(self, hr_client, db_session):
        """Test retrieving client history."""
        # Create test client
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        # Update the client to create history
        update_data = {"name": "Updated Client"}
        hr_client.put(f"/api/clients/{client.id}", json=update_data)
        
        response = hr_client.get(f"/api/clients/{client.id}/history")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1  # At least creation record
        
        # Check that history records have required fields
        for record in data:
            assert "id" in record
            assert "action" in record
            assert "changed_at" in record


class TestClientActivation:
    """Test client activation/deactivation functionality."""

    def test_activate_client(self, hr_client, db_session):
        """Test client activation."""
        # Create inactive client
        client = Client(
            name="Inactive Client",
            status=ClientStatus.INACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        response = hr_client.post(f"/api/clients/{client.id}/activate")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "active"

    def test_deactivate_client(self, hr_client, db_session):
        """Test client deactivation."""
        # Create active client
        client = Client(
            name="Active Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        response = hr_client.post(f"/api/clients/{client.id}/deactivate")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "inactive"


class TestClientAuthorization:
    """Test client endpoint authorization."""

    def test_unauthenticated_access_denied(self, client):
        """Test that unauthenticated users cannot access client endpoints."""
        # Clear any existing cookies
        client.cookies.clear()
        
        response = client.get("/api/clients/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_access_allowed(self, hr_client):
        """Test that authenticated users can access client endpoints."""
        response = hr_client.get("/api/clients/")
        assert response.status_code == status.HTTP_200_OK


class TestClientValidation:
    """Test client data validation."""

    def test_invalid_email_format(self, hr_client, db_session):
        """Test contact creation with invalid email format."""
        # Create test client
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        contact_data = {
            "name": "John Doe",
            "email": "invalid-email",  # Invalid email format
        }
        
        response = hr_client.post(f"/api/clients/{client.id}/contacts", json=contact_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_invalid_phone_format(self, hr_client, db_session):
        """Test contact creation with invalid phone format."""
        # Create test client
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        contact_data = {
            "name": "John Doe",
            "phone": "123",  # Too short
        }
        
        response = hr_client.post(f"/api/clients/{client.id}/contacts", json=contact_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_empty_client_name(self, hr_client):
        """Test client creation with empty name."""
        client_data = {
            "name": "",  # Empty name
            "status": "active",
            "relation_type": "Customer",
        }
        
        response = hr_client.post("/api/clients/", json=client_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_invalid_pagination_params(self, hr_client):
        """Test invalid pagination parameters."""
        # Test negative page
        response = hr_client.get("/api/clients/?page=-1")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Test page size too large
        response = hr_client.get("/api/clients/?page_size=101")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_invalid_sort_parameters(self, hr_client):
        """Test invalid sort parameters."""
        # Test invalid sort field - this should raise a validation error during parameter parsing
        with pytest.raises(Exception) as exc_info:
            hr_client.get("/api/clients/?sort_by=invalid_field")
        assert "Sort field must be one of" in str(exc_info.value)
        
        # Test invalid sort order - this should also raise a validation error
        with pytest.raises(Exception) as exc_info:
            hr_client.get("/api/clients/?sort_order=invalid_order")
        assert "Sort order must be 'asc' or 'desc'" in str(exc_info.value)