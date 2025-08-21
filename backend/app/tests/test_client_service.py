"""
Tests for client service business logic.

This module contains unit tests for the ClientService class,
testing business logic, validation, and error handling.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime

from app.models.client import Client, ClientContact, ClientHistory, ClientStatus, RelationType, ClientHistoryAction
from app.schemas.client import ClientCreateRequest, ClientUpdateRequest, ClientContactCreateRequest
from app.services.client_service import (
    ClientService,
    ClientServiceError,
    ClientNotFoundError,
    ClientNameExistsError,
    ClientHasDependenciesError,
    ContactNotFoundError,
)


class TestClientServiceCRUD:
    """Test client service CRUD operations."""

    def test_create_client_success(self, db_session, test_hr_user):
        """Test successful client creation."""
        service = ClientService(db_session)
        
        client_data = ClientCreateRequest(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
            comments="Test comments",
        )
        
        client = service.create_client(client_data, test_hr_user.id)
        
        assert client.name == "Test Client"
        assert client.status == ClientStatus.ACTIVE
        assert client.relation_type == RelationType.CUSTOMER
        assert client.comments == "Test comments"
        assert client.created_by == test_hr_user.id
        assert client.id is not None

    def test_create_client_duplicate_name(self, db_session, test_hr_user):
        """Test client creation with duplicate name raises error."""
        service = ClientService(db_session)
        
        # Create first client
        existing_client = Client(
            name="Duplicate Name",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(existing_client)
        db_session.commit()
        
        # Try to create client with same name
        client_data = ClientCreateRequest(
            name="Duplicate Name",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        
        with pytest.raises(ClientNameExistsError) as exc_info:
            service.create_client(client_data, test_hr_user.id)
        
        assert "already exists" in str(exc_info.value)

    def test_get_client_success(self, db_session):
        """Test successful client retrieval."""
        service = ClientService(db_session)
        
        # Create test client
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        retrieved_client = service.get_client(client.id)
        
        assert retrieved_client.id == client.id
        assert retrieved_client.name == "Test Client"

    def test_get_client_not_found(self, db_session):
        """Test client retrieval for non-existent client."""
        service = ClientService(db_session)
        
        with pytest.raises(ClientNotFoundError) as exc_info:
            service.get_client(99999)
        
        assert "not found" in str(exc_info.value)

    def test_update_client_success(self, db_session, test_hr_user):
        """Test successful client update."""
        service = ClientService(db_session)
        
        # Create test client
        client = Client(
            name="Original Name",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        # Update client
        update_data = ClientUpdateRequest(
            name="Updated Name",
            status=ClientStatus.INACTIVE,
            comments="Updated comments",
        )
        
        updated_client = service.update_client(client.id, update_data, test_hr_user.id)
        
        assert updated_client.name == "Updated Name"
        assert updated_client.status == ClientStatus.INACTIVE
        assert updated_client.comments == "Updated comments"

    def test_update_client_duplicate_name(self, db_session, test_hr_user):
        """Test client update with duplicate name raises error."""
        service = ClientService(db_session)
        
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
        update_data = ClientUpdateRequest(name="Client 1")
        
        with pytest.raises(ClientNameExistsError):
            service.update_client(client2.id, update_data, test_hr_user.id)

    def test_delete_client_without_dependencies(self, db_session, test_hr_user):
        """Test client deletion without dependencies."""
        service = ClientService(db_session)
        
        # Create test client
        client = Client(
            name="Client to Delete",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        client_id = client.id
        
        # Delete client
        service.delete_client(client_id, test_hr_user.id)
        
        # Verify client is deleted
        with pytest.raises(ClientNotFoundError):
            service.get_client(client_id)


class TestClientServiceSearch:
    """Test client search and filtering functionality."""

    def test_search_clients_by_name(self, db_session):
        """Test searching clients by name."""
        service = ClientService(db_session)
        
        # Create test clients
        clients = [
            Client(name="Acme Corp", status=ClientStatus.ACTIVE, relation_type=RelationType.CUSTOMER),
            Client(name="Beta Inc", status=ClientStatus.ACTIVE, relation_type=RelationType.CUSTOMER),
            Client(name="Gamma LLC", status=ClientStatus.ACTIVE, relation_type=RelationType.CUSTOMER),
        ]
        db_session.add_all(clients)
        db_session.commit()
        
        # Search by name
        from app.schemas.client import ClientSearchParams
        params = ClientSearchParams(search="Acme")
        
        results, total = service.search_clients(params)
        
        assert total == 1
        assert len(results) == 1
        assert results[0].name == "Acme Corp"

    def test_filter_clients_by_status(self, db_session):
        """Test filtering clients by status."""
        service = ClientService(db_session)
        
        # Create test clients
        clients = [
            Client(name="Active Client", status=ClientStatus.ACTIVE, relation_type=RelationType.CUSTOMER),
            Client(name="Inactive Client", status=ClientStatus.INACTIVE, relation_type=RelationType.CUSTOMER),
        ]
        db_session.add_all(clients)
        db_session.commit()
        
        # Filter by active status
        from app.schemas.client import ClientSearchParams
        params = ClientSearchParams(status=ClientStatus.ACTIVE)
        
        results, total = service.search_clients(params)
        
        assert total == 1
        assert results[0].status == ClientStatus.ACTIVE

    def test_pagination(self, db_session):
        """Test client pagination."""
        service = ClientService(db_session)
        
        # Create 15 test clients
        clients = [
            Client(
                name=f"Client {i}",
                status=ClientStatus.ACTIVE,
                relation_type=RelationType.CUSTOMER
            )
            for i in range(15)
        ]
        db_session.add_all(clients)
        db_session.commit()
        
        # Test first page
        from app.schemas.client import ClientSearchParams
        params = ClientSearchParams(page=1, page_size=10)
        
        results, total = service.search_clients(params)
        
        assert total == 15
        assert len(results) == 10


class TestClientServiceContacts:
    """Test client contact management."""

    def test_create_contact_success(self, db_session, test_hr_user):
        """Test successful contact creation."""
        service = ClientService(db_session)
        
        # Create test client
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        # Create contact
        contact_data = ClientContactCreateRequest(
            name="John Doe",
            email="john@example.com",
            phone="555-123-4567",
            role="Manager",
            is_primary=True,
        )
        
        contact = service.create_contact(client.id, contact_data, test_hr_user.id)
        
        assert contact.name == "John Doe"
        assert contact.email == "john@example.com"
        assert contact.phone == "555-123-4567"
        assert contact.role == "Manager"
        assert contact.is_primary is True
        assert contact.client_id == client.id

    def test_create_contact_client_not_found(self, db_session, test_hr_user):
        """Test contact creation for non-existent client."""
        service = ClientService(db_session)
        
        contact_data = ClientContactCreateRequest(
            name="John Doe",
            email="john@example.com",
        )
        
        with pytest.raises(ClientNotFoundError):
            service.create_contact(99999, contact_data, test_hr_user.id)

    def test_primary_contact_logic(self, db_session, test_hr_user):
        """Test primary contact designation logic."""
        service = ClientService(db_session)
        
        # Create test client
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        # Create first primary contact
        contact1_data = ClientContactCreateRequest(
            name="John Doe",
            email="john@example.com",
            is_primary=True,
        )
        contact1 = service.create_contact(client.id, contact1_data, test_hr_user.id)
        
        # Create second primary contact (should clear first)
        contact2_data = ClientContactCreateRequest(
            name="Jane Smith",
            email="jane@example.com",
            is_primary=True,
        )
        contact2 = service.create_contact(client.id, contact2_data, test_hr_user.id)
        
        # Refresh contacts
        db_session.refresh(contact1)
        db_session.refresh(contact2)
        
        # Only the second contact should be primary
        assert contact1.is_primary is False
        assert contact2.is_primary is True

    def test_get_client_contacts(self, db_session):
        """Test retrieving client contacts."""
        service = ClientService(db_session)
        
        # Create test client
        client = Client(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.flush()
        
        # Create contacts
        contacts = [
            ClientContact(
                client_id=client.id,
                name="John Doe",
                is_primary=True,
            ),
            ClientContact(
                client_id=client.id,
                name="Jane Smith",
                is_primary=False,
            ),
        ]
        db_session.add_all(contacts)
        db_session.commit()
        
        # Get contacts
        retrieved_contacts = service.get_client_contacts(client.id)
        
        assert len(retrieved_contacts) == 2
        # Primary contact should be first
        assert retrieved_contacts[0].is_primary is True
        assert retrieved_contacts[0].name == "John Doe"


class TestClientServiceHistory:
    """Test client audit trail functionality."""

    def test_audit_trail_creation(self, db_session, test_hr_user):
        """Test that audit trail is created for client operations."""
        service = ClientService(db_session)
        
        # Create client (should create audit record)
        client_data = ClientCreateRequest(
            name="Test Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        client = service.create_client(client_data, test_hr_user.id)
        
        # Check audit trail
        history = service.get_client_history(client.id)
        assert len(history) == 1
        assert history[0].action == ClientHistoryAction.CREATED
        assert history[0].changed_by == test_hr_user.id

    def test_audit_trail_update(self, db_session, test_hr_user):
        """Test audit trail for client updates."""
        service = ClientService(db_session)
        
        # Create client
        client = Client(
            name="Original Name",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        # Update client
        update_data = ClientUpdateRequest(
            name="Updated Name",
            status=ClientStatus.INACTIVE,
        )
        service.update_client(client.id, update_data, test_hr_user.id)
        
        # Check audit trail
        history = service.get_client_history(client.id)
        update_record = next((h for h in history if h.action == ClientHistoryAction.UPDATED), None)
        
        assert update_record is not None
        assert update_record.changed_by == test_hr_user.id
        assert "name" in update_record.changed_fields
        assert "status" in update_record.changed_fields
        assert update_record.old_values["name"] == "Original Name"
        assert update_record.new_values["name"] == "Updated Name"


class TestClientServiceValidation:
    """Test client service validation logic."""

    def test_client_name_validation(self, db_session, test_hr_user):
        """Test client name validation."""
        service = ClientService(db_session)
        
        # Test with whitespace-only name (should be handled by Pydantic validation)
        with pytest.raises(Exception) as exc_info:
            client_data = ClientCreateRequest(
                name="   ",  # Whitespace only
                status=ClientStatus.ACTIVE,
                relation_type=RelationType.CUSTOMER,
            )
        assert "Client name cannot be empty" in str(exc_info.value)
        
        # This should raise a validation error from Pydantic before reaching the service
        with pytest.raises(Exception):  # Pydantic validation error
            client = service.create_client(client_data, test_hr_user.id)

    def test_dependency_checking(self, db_session):
        """Test client dependency checking."""
        service = ClientService(db_session)
        
        # Create client
        client = Client(
            name="Client with Dependencies",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        # Mock having active projects (would be checked in real scenario)
        dependencies = service._check_client_dependencies(client.id)
        
        # For now, should be empty list since no projects exist
        assert isinstance(dependencies, list)


class TestClientServiceErrorHandling:
    """Test client service error handling."""

    def test_database_error_handling(self, db_session, test_hr_user):
        """Test handling of database errors."""
        service = ClientService(db_session)
        
        # Mock a database error
        with patch.object(db_session, 'commit', side_effect=Exception("Database error")):
            client_data = ClientCreateRequest(
                name="Test Client",
                status=ClientStatus.ACTIVE,
                relation_type=RelationType.CUSTOMER,
            )
            
            with pytest.raises(ClientServiceError) as exc_info:
                service.create_client(client_data, test_hr_user.id)
            
            assert "Unexpected error" in str(exc_info.value)

    def test_contact_not_found_error(self, db_session, test_hr_user):
        """Test ContactNotFoundError handling."""
        service = ClientService(db_session)
        
        from app.schemas.client import ClientContactUpdateRequest
        update_data = ClientContactUpdateRequest(name="New Name")
        
        with pytest.raises(ContactNotFoundError):
            service.update_contact(99999, update_data, test_hr_user.id)


class TestClientServiceActivation:
    """Test client activation/deactivation functionality."""

    def test_activate_client(self, db_session, test_hr_user):
        """Test client activation."""
        service = ClientService(db_session)
        
        # Create inactive client
        client = Client(
            name="Inactive Client",
            status=ClientStatus.INACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        # Activate client
        activated_client = service.activate_client(client.id, test_hr_user.id)
        
        assert activated_client.status == ClientStatus.ACTIVE
        
        # Check audit trail
        history = service.get_client_history(client.id)
        activation_record = next(
            (h for h in history if h.action == ClientHistoryAction.ACTIVATED), None
        )
        assert activation_record is not None

    def test_deactivate_client(self, db_session, test_hr_user):
        """Test client deactivation."""
        service = ClientService(db_session)
        
        # Create active client
        client = Client(
            name="Active Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        # Deactivate client
        deactivated_client = service.deactivate_client(client.id, test_hr_user.id)
        
        assert deactivated_client.status == ClientStatus.INACTIVE
        
        # Check audit trail
        history = service.get_client_history(client.id)
        deactivation_record = next(
            (h for h in history if h.action == ClientHistoryAction.DEACTIVATED), None
        )
        assert deactivation_record is not None

    def test_activate_already_active_client(self, db_session, test_hr_user):
        """Test activating an already active client."""
        service = ClientService(db_session)
        
        # Create active client
        client = Client(
            name="Active Client",
            status=ClientStatus.ACTIVE,
            relation_type=RelationType.CUSTOMER,
        )
        db_session.add(client)
        db_session.commit()
        
        # Try to activate already active client
        result = service.activate_client(client.id, test_hr_user.id)
        
        assert result.status == ClientStatus.ACTIVE
        # Should not create duplicate audit record