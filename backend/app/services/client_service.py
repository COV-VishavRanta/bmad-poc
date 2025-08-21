"""
Client service for business logic and data operations.

This module provides the business logic layer for client management,
including CRUD operations, validation, audit trail, and dependency checking.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from sqlalchemy import and_, or_, text, desc, asc, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.client import (
    Client,
    ClientContact,
    ClientHistory,
    ClientStatus,
    RelationType,
    ClientHistoryAction,
)
from app.models.project import Project
from app.schemas.client import (
    ClientCreateRequest,
    ClientUpdateRequest,
    ClientSearchParams,
    ClientContactCreateRequest,
    ClientContactUpdateRequest,
)


class ClientServiceError(Exception):
    """Base exception for client service errors."""

    def __init__(self, message: str, code: str = "CLIENT_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class ClientNotFoundError(ClientServiceError):
    """Exception raised when client is not found."""

    def __init__(self, client_id: int):
        super().__init__(f"Client with ID {client_id} not found", "CLIENT_NOT_FOUND")


class ClientNameExistsError(ClientServiceError):
    """Exception raised when client name already exists."""

    def __init__(self, name: str):
        super().__init__(f"Client with name '{name}' already exists", "CLIENT_NAME_EXISTS")


class ClientHasDependenciesError(ClientServiceError):
    """Exception raised when trying to delete client with dependencies."""

    def __init__(self, client_id: int, dependencies: List[str]):
        deps_str = ", ".join(dependencies)
        super().__init__(
            f"Cannot delete client {client_id}. Active dependencies: {deps_str}",
            "CLIENT_HAS_DEPENDENCIES"
        )


class ContactNotFoundError(ClientServiceError):
    """Exception raised when contact is not found."""

    def __init__(self, contact_id: int):
        super().__init__(f"Contact with ID {contact_id} not found", "CONTACT_NOT_FOUND")


class ClientService:
    """Service class for client management operations."""

    def __init__(self, db: Session):
        """Initialize the client service."""
        self.db = db

    def create_client(
        self, client_data: ClientCreateRequest, created_by_id: Optional[int] = None
    ) -> Client:
        """
        Create a new client.

        Args:
            client_data: Client creation data
            created_by_id: ID of the user creating the client

        Returns:
            Client: The created client

        Raises:
            ClientNameExistsError: If client name already exists
            ClientServiceError: If creation fails
        """
        try:
            # Check if client name already exists
            existing_client = (
                self.db.query(Client)
                .filter(Client.name == client_data.name)
                .first()
            )
            if existing_client:
                raise ClientNameExistsError(client_data.name)

            # Create the client
            client = Client(
                name=client_data.name,
                status=client_data.status,
                relation_type=client_data.relation_type,
                project_management_tool=client_data.project_management_tool,
                comments=client_data.comments,
                created_by=created_by_id,
            )

            self.db.add(client)
            self.db.flush()  # Flush to get the ID

            # Create audit trail
            self._create_audit_record(
                client_id=client.id,
                action=ClientHistoryAction.CREATED,
                new_values=self._serialize_for_audit(client_data.model_dump()),
                changed_by=created_by_id,
            )

            self.db.commit()
            return client

        except IntegrityError as e:
            self.db.rollback()
            if "name" in str(e):
                raise ClientNameExistsError(client_data.name)
            raise ClientServiceError(f"Failed to create client: {str(e)}")
        except Exception as e:
            self.db.rollback()
            if isinstance(e, ClientServiceError):
                raise
            raise ClientServiceError(f"Unexpected error creating client: {str(e)}")

    def get_client(self, client_id: int, include_contacts: bool = True) -> Client:
        """
        Get a client by ID.

        Args:
            client_id: Client ID
            include_contacts: Whether to include contacts

        Returns:
            Client: The client

        Raises:
            ClientNotFoundError: If client is not found
        """
        query = self.db.query(Client)
        
        if include_contacts:
            query = query.options(joinedload(Client.contacts))
            
        client = query.filter(Client.id == client_id).first()
        
        if not client:
            raise ClientNotFoundError(client_id)
            
        return client

    def update_client(
        self,
        client_id: int,
        client_data: ClientUpdateRequest,
        updated_by_id: Optional[int] = None,
    ) -> Client:
        """
        Update an existing client.

        Args:
            client_id: Client ID
            client_data: Client update data
            updated_by_id: ID of the user updating the client

        Returns:
            Client: The updated client

        Raises:
            ClientNotFoundError: If client is not found
            ClientNameExistsError: If new name already exists
            ClientServiceError: If update fails
        """
        try:
            client = self.get_client(client_id, include_contacts=False)
            
            # Track changes for audit trail
            old_values = {}
            new_values = {}
            changed_fields = []

            # Check if name is being updated and doesn't conflict
            if client_data.name is not None and client_data.name != client.name:
                existing_client = (
                    self.db.query(Client)
                    .filter(Client.name == client_data.name, Client.id != client_id)
                    .first()
                )
                if existing_client:
                    raise ClientNameExistsError(client_data.name)

            # Update fields and track changes
            update_data = client_data.model_dump(exclude_unset=True)
            for field, new_value in update_data.items():
                if hasattr(client, field):
                    old_value = getattr(client, field)
                    if old_value != new_value:
                        old_values[field] = old_value.value if hasattr(old_value, 'value') else old_value
                        new_values[field] = new_value.value if hasattr(new_value, 'value') else new_value
                        changed_fields.append(field)
                        setattr(client, field, new_value)

            if changed_fields:
                # Create audit trail
                self._create_audit_record(
                    client_id=client.id,
                    action=ClientHistoryAction.UPDATED,
                    changed_fields=changed_fields,
                    old_values=self._serialize_for_audit(old_values),
                    new_values=self._serialize_for_audit(new_values),
                    changed_by=updated_by_id,
                )

            self.db.commit()
            return client

        except IntegrityError as e:
            self.db.rollback()
            if "name" in str(e):
                raise ClientNameExistsError(client_data.name or "")
            raise ClientServiceError(f"Failed to update client: {str(e)}")
        except Exception as e:
            self.db.rollback()
            if isinstance(e, ClientServiceError):
                raise
            raise ClientServiceError(f"Unexpected error updating client: {str(e)}")

    def delete_client(
        self, client_id: int, deleted_by_id: Optional[int] = None, force: bool = False
    ) -> None:
        """
        Delete a client.

        Args:
            client_id: Client ID
            deleted_by_id: ID of the user deleting the client
            force: If True, perform soft delete when dependencies exist

        Raises:
            ClientNotFoundError: If client is not found
            ClientHasDependenciesError: If client has dependencies and force=False
            ClientServiceError: If deletion fails
        """
        try:
            client = self.get_client(client_id, include_contacts=False)
            
            # Check for dependencies
            dependencies = self._check_client_dependencies(client_id)
            
            if dependencies and not force:
                raise ClientHasDependenciesError(client_id, dependencies)
            
            if dependencies and force:
                # Soft delete - deactivate instead of deleting
                old_status = client.status
                client.status = ClientStatus.INACTIVE
                
                self._create_audit_record(
                    client_id=client.id,
                    action=ClientHistoryAction.DEACTIVATED,
                    changed_fields=["status"],
                    old_values=self._serialize_for_audit({"status": old_status}),
                    new_values=self._serialize_for_audit({"status": ClientStatus.INACTIVE}),
                    changed_by=deleted_by_id,
                )
            else:
                # Hard delete
                self._create_audit_record(
                    client_id=client.id,
                    action=ClientHistoryAction.DELETED,
                    old_values=self._serialize_for_audit(client.to_dict()),
                    changed_by=deleted_by_id,
                )
                
                self.db.delete(client)
            
            self.db.commit()

        except Exception as e:
            self.db.rollback()
            if isinstance(e, ClientServiceError):
                raise
            raise ClientServiceError(f"Unexpected error deleting client: {str(e)}")

    def search_clients(self, params: ClientSearchParams) -> Tuple[List[Client], int]:
        """
        Search and filter clients with pagination.

        Args:
            params: Search parameters

        Returns:
            Tuple[List[Client], int]: List of clients and total count
        """
        query = self.db.query(Client).options(joinedload(Client.contacts))
        
        # Apply search filter
        if params.search:
            search_term = f"%{params.search}%"
            query = query.filter(
                or_(
                    Client.name.ilike(search_term),
                    Client.comments.ilike(search_term)
                )
            )
        
        # Apply status filter
        if params.status:
            query = query.filter(Client.status == params.status)
        
        # Apply relation type filter
        if params.relation_type:
            query = query.filter(Client.relation_type == params.relation_type)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply sorting
        sort_column = getattr(Client, params.sort_by, Client.name)
        if params.sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (params.page - 1) * params.page_size
        clients = query.offset(offset).limit(params.page_size).all()
        
        return clients, total

    def get_client_history(self, client_id: int) -> List[ClientHistory]:
        """
        Get client history records.

        Args:
            client_id: Client ID

        Returns:
            List[ClientHistory]: List of history records

        Raises:
            ClientNotFoundError: If client is not found
        """
        # Verify client exists
        self.get_client(client_id, include_contacts=False)
        
        history = (
            self.db.query(ClientHistory)
            .filter(ClientHistory.client_id == client_id)
            .order_by(desc(ClientHistory.changed_at))
            .all()
        )
        
        return history

    # Contact management methods
    def create_contact(
        self,
        client_id: int,
        contact_data: ClientContactCreateRequest,
        created_by_id: Optional[int] = None,
    ) -> ClientContact:
        """
        Create a new client contact.

        Args:
            client_id: Client ID
            contact_data: Contact creation data
            created_by_id: ID of the user creating the contact

        Returns:
            ClientContact: The created contact

        Raises:
            ClientNotFoundError: If client is not found
            ClientServiceError: If creation fails
        """
        try:
            # Verify client exists
            self.get_client(client_id, include_contacts=False)
            
            # Handle primary contact logic
            if contact_data.is_primary:
                self._clear_primary_contact(client_id)
            
            # Create the contact
            contact = ClientContact(
                client_id=client_id,
                name=contact_data.name,
                email=contact_data.email,
                phone=contact_data.phone,
                role=contact_data.role,
                is_primary=contact_data.is_primary,
            )
            
            self.db.add(contact)
            self.db.commit()
            return contact

        except Exception as e:
            self.db.rollback()
            if isinstance(e, ClientServiceError):
                raise
            raise ClientServiceError(f"Unexpected error creating contact: {str(e)}")

    def update_contact(
        self,
        contact_id: int,
        contact_data: ClientContactUpdateRequest,
        updated_by_id: Optional[int] = None,
    ) -> ClientContact:
        """
        Update an existing client contact.

        Args:
            contact_id: Contact ID
            contact_data: Contact update data
            updated_by_id: ID of the user updating the contact

        Returns:
            ClientContact: The updated contact

        Raises:
            ContactNotFoundError: If contact is not found
            ClientServiceError: If update fails
        """
        try:
            contact = self.db.query(ClientContact).filter(ClientContact.id == contact_id).first()
            if not contact:
                raise ContactNotFoundError(contact_id)
            
            # Handle primary contact logic
            if contact_data.is_primary is True and not contact.is_primary:
                self._clear_primary_contact(contact.client_id)
            
            # Update fields
            update_data = contact_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                if hasattr(contact, field):
                    setattr(contact, field, value)
            
            self.db.commit()
            return contact

        except Exception as e:
            self.db.rollback()
            if isinstance(e, ClientServiceError):
                raise
            raise ClientServiceError(f"Unexpected error updating contact: {str(e)}")

    def delete_contact(self, contact_id: int, deleted_by_id: Optional[int] = None) -> None:
        """
        Delete a client contact.

        Args:
            contact_id: Contact ID
            deleted_by_id: ID of the user deleting the contact

        Raises:
            ContactNotFoundError: If contact is not found
            ClientServiceError: If deletion fails
        """
        try:
            contact = self.db.query(ClientContact).filter(ClientContact.id == contact_id).first()
            if not contact:
                raise ContactNotFoundError(contact_id)
            
            self.db.delete(contact)
            self.db.commit()

        except Exception as e:
            self.db.rollback()
            if isinstance(e, ClientServiceError):
                raise
            raise ClientServiceError(f"Unexpected error deleting contact: {str(e)}")

    def get_client_contacts(self, client_id: int) -> List[ClientContact]:
        """
        Get all contacts for a client.

        Args:
            client_id: Client ID

        Returns:
            List[ClientContact]: List of contacts

        Raises:
            ClientNotFoundError: If client is not found
        """
        # Verify client exists
        self.get_client(client_id, include_contacts=False)
        
        contacts = (
            self.db.query(ClientContact)
            .filter(ClientContact.client_id == client_id)
            .order_by(ClientContact.is_primary.desc(), ClientContact.name)
            .all()
        )
        
        return contacts

    # Private helper methods
    def _serialize_for_audit(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize data for audit trail, handling enums and other non-JSON-serializable types."""
        result = {}
        for key, value in data.items():
            if hasattr(value, 'value'):  # Enum
                result[key] = value.value
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result

    def _create_audit_record(
        self,
        client_id: int,
        action: ClientHistoryAction,
        changed_fields: Optional[List[str]] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        changed_by: Optional[int] = None,
    ) -> None:
        """Create an audit trail record."""
        history = ClientHistory(
            client_id=client_id,
            action=action,
            changed_fields=changed_fields,
            old_values=old_values,
            new_values=new_values,
            changed_by=changed_by,
            changed_at=datetime.utcnow(),
        )
        self.db.add(history)

    def _check_client_dependencies(self, client_id: int) -> List[str]:
        """Check for client dependencies that prevent deletion."""
        dependencies = []
        
        # Check for active projects
        active_projects = (
            self.db.query(Project)
            .filter(
                and_(
                    Project.client_id == client_id,
                    Project.status.in_(["planned", "active", "on_hold"])
                )
            )
            .count()
        )
        
        if active_projects > 0:
            dependencies.append(f"{active_projects} active projects")
        
        # Add other dependency checks as needed (SOWs, Groups, etc.)
        
        return dependencies

    def _clear_primary_contact(self, client_id: int) -> None:
        """Clear the primary contact flag for all contacts of a client."""
        self.db.query(ClientContact).filter(
            and_(
                ClientContact.client_id == client_id,
                ClientContact.is_primary == True
            )
        ).update({"is_primary": False})

    def activate_client(self, client_id: int, activated_by_id: Optional[int] = None) -> Client:
        """
        Activate a client.

        Args:
            client_id: Client ID
            activated_by_id: ID of the user activating the client

        Returns:
            Client: The activated client

        Raises:
            ClientNotFoundError: If client is not found
            ClientServiceError: If activation fails
        """
        try:
            client = self.get_client(client_id, include_contacts=False)
            
            if client.status == ClientStatus.ACTIVE:
                return client  # Already active
            
            old_status = client.status
            client.status = ClientStatus.ACTIVE
            
            self._create_audit_record(
                client_id=client.id,
                action=ClientHistoryAction.ACTIVATED,
                changed_fields=["status"],
                old_values=self._serialize_for_audit({"status": old_status}),
                new_values=self._serialize_for_audit({"status": ClientStatus.ACTIVE}),
                changed_by=activated_by_id,
            )
            
            self.db.commit()
            return client

        except Exception as e:
            self.db.rollback()
            if isinstance(e, ClientServiceError):
                raise
            raise ClientServiceError(f"Unexpected error activating client: {str(e)}")

    def deactivate_client(
        self, client_id: int, deactivated_by_id: Optional[int] = None
    ) -> Client:
        """
        Deactivate a client.

        Args:
            client_id: Client ID
            deactivated_by_id: ID of the user deactivating the client

        Returns:
            Client: The deactivated client

        Raises:
            ClientNotFoundError: If client is not found
            ClientServiceError: If deactivation fails
        """
        try:
            client = self.get_client(client_id, include_contacts=False)
            
            if client.status == ClientStatus.INACTIVE:
                return client  # Already inactive
            
            old_status = client.status
            client.status = ClientStatus.INACTIVE
            
            self._create_audit_record(
                client_id=client.id,
                action=ClientHistoryAction.DEACTIVATED,
                changed_fields=["status"],
                old_values=self._serialize_for_audit({"status": old_status}),
                new_values=self._serialize_for_audit({"status": ClientStatus.INACTIVE}),
                changed_by=deactivated_by_id,
            )
            
            self.db.commit()
            return client

        except Exception as e:
            self.db.rollback()
            if isinstance(e, ClientServiceError):
                raise
            raise ClientServiceError(f"Unexpected error deactivating client: {str(e)}")