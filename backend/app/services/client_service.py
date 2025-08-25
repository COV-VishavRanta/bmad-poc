"""
Client management service.

This module provides business logic for client CRUD operations,
validation, audit logging, and role-based access control.
"""

import json
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.client import Client, ClientHistory, HistoryAction, get_client_permissions
from app.models.user import User
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse,
    ClientWithHistory, ClientSearchParams
)


class ClientService:
    """Service class for client management operations."""

    def __init__(self, db: Session):
        """
        Initialize the client service.
        
        Args:
            db: Database session
        """
        self.db = db

    def create_client(self, client_data: ClientCreate, current_user: User) -> ClientResponse:
        """
        Create a new client.
        
        Args:
            client_data: Client creation data
            current_user: User creating the client
            
        Returns:
            Created client data
            
        Raises:
            HTTPException: If user lacks permission or client name exists
        """
        # Check permissions
        permissions = get_client_permissions(current_user.role)
        if not permissions.get("can_create", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create clients"
            )

        # Check if client name already exists
        existing_client = self.db.query(Client).filter(
            Client.name == client_data.name
        ).first()
        if existing_client:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Client with name '{client_data.name}' already exists"
            )

        # Create new client
        db_client = Client(
            name=client_data.name,
            client_type=client_data.client_type.value,
            status=client_data.status.value,
            relation_type=client_data.relation_type,
            project_mgmt_tool=client_data.project_mgmt_tool,
            comments=client_data.comments,
            created_by=current_user.id
        )

        self.db.add(db_client)
        self.db.commit()
        self.db.refresh(db_client)

        # Create audit history entry
        self._create_audit_entry(
            client_id=db_client.id,
            action=HistoryAction.CREATE,
            old_values=None,
            new_values=self._client_to_dict(db_client),
            changed_by=current_user.id
        )
        self.db.commit()  # Commit the audit entry

        return ClientResponse.model_validate(db_client)

    def get_client(self, client_id: int, current_user: User) -> ClientResponse:
        """
        Get a client by ID.
        
        Args:
            client_id: Client ID
            current_user: User requesting the client
            
        Returns:
            Client data
            
        Raises:
            HTTPException: If client not found or user lacks permission
        """
        permissions = get_client_permissions(current_user.role)
        if not permissions.get("can_read_all", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view clients"
            )

        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client with ID {client_id} not found"
            )

        return ClientResponse.model_validate(client)

    def get_client_with_history(self, client_id: int, current_user: User) -> ClientWithHistory:
        """
        Get a client with audit history.
        
        Args:
            client_id: Client ID
            current_user: User requesting the client
            
        Returns:
            Client data with audit history
            
        Raises:
            HTTPException: If client not found or user lacks permission
        """
        permissions = get_client_permissions(current_user.role)
        if not permissions.get("can_view_audit", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view client audit history"
            )

        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client with ID {client_id} not found"
            )

        return ClientWithHistory.model_validate(client)

    def list_clients(self, params: ClientSearchParams, current_user: User) -> ClientListResponse:
        """
        List clients with filtering and pagination.
        
        Args:
            params: Search and pagination parameters
            current_user: User requesting the list
            
        Returns:
            Paginated list of clients
            
        Raises:
            HTTPException: If user lacks permission
        """
        permissions = get_client_permissions(current_user.role)
        if not permissions.get("can_read_all", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view clients"
            )

        # Build query
        query = self.db.query(Client)

        # Apply filters
        if params.search:
            search_filter = f"%{params.search}%"
            query = query.filter(
                or_(
                    Client.name.ilike(search_filter),
                    Client.relation_type.ilike(search_filter),
                    Client.comments.ilike(search_filter)
                )
            )

        if params.client_type:
            query = query.filter(Client.client_type == params.client_type.value)

        if params.status:
            query = query.filter(Client.status == params.status.value)

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (params.page - 1) * params.limit
        clients = query.offset(offset).limit(params.limit).all()

        # Convert to response models
        client_responses = [ClientResponse.model_validate(client) for client in clients]

        return ClientListResponse(
            clients=client_responses,
            total=total,
            page=params.page,
            limit=params.limit,
            has_next=offset + params.limit < total,
            has_prev=params.page > 1
        )

    def update_client(self, client_id: int, client_data: ClientUpdate, current_user: User) -> ClientResponse:
        """
        Update an existing client.
        
        Args:
            client_id: Client ID
            client_data: Updated client data
            current_user: User updating the client
            
        Returns:
            Updated client data
            
        Raises:
            HTTPException: If client not found or user lacks permission
        """
        # Get client
        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client with ID {client_id} not found"
            )

        # Check permissions
        permissions = get_client_permissions(current_user.role)
        can_update = permissions.get("can_update_all", False)
        
        # TODO: Add logic for PC role to only update assigned clients
        if not can_update:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update this client"
            )

        # Store old values for audit
        old_values = self._client_to_dict(client)

        # Check for name uniqueness if name is being updated
        if client_data.name and client_data.name != client.name:
            existing_client = self.db.query(Client).filter(
                and_(Client.name == client_data.name, Client.id != client_id)
            ).first()
            if existing_client:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Client with name '{client_data.name}' already exists"
                )

        # Update fields
        update_data = client_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(client, field):
                if field in ['client_type', 'status']:
                    # Handle enum values properly
                    if hasattr(value, 'value'):
                        setattr(client, field, value.value)
                    else:
                        setattr(client, field, value)
                else:
                    setattr(client, field, value)

        client.updated_by = current_user.id
        
        self.db.commit()
        self.db.refresh(client)

        # Create audit history entry
        new_values = self._client_to_dict(client)
        self._create_audit_entry(
            client_id=client.id,
            action=HistoryAction.UPDATE,
            old_values=old_values,
            new_values=new_values,
            changed_by=current_user.id
        )
        self.db.commit()  # Commit the audit entry

        return ClientResponse.model_validate(client)

    def delete_client(self, client_id: int, current_user: User) -> Dict[str, str]:
        """
        Delete a client.
        
        Args:
            client_id: Client ID
            current_user: User deleting the client
            
        Returns:
            Deletion confirmation message
            
        Raises:
            HTTPException: If client not found, has dependencies, or user lacks permission
        """
        # Get client
        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client with ID {client_id} not found"
            )

        # Check permissions
        permissions = get_client_permissions(current_user.role)
        if not permissions.get("can_delete", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete clients"
            )

        # Check if client can be deleted (no active projects)
        if not client.can_be_deleted():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete client with active projects. Deactivate the client instead."
            )

        # Store client data for audit before deletion
        client_data = self._client_to_dict(client)

        # Create audit history entry before deletion
        self._create_audit_entry(
            client_id=client.id,
            action=HistoryAction.DELETE,
            old_values=client_data,
            new_values=None,
            changed_by=current_user.id
        )

        # Delete client (audit history will be preserved due to FK constraint)
        self.db.delete(client)
        self.db.commit()

        return {"message": f"Client '{client_data['name']}' deleted successfully"}

    def deactivate_client(self, client_id: int, current_user: User) -> ClientResponse:
        """
        Deactivate a client instead of deleting.
        
        Args:
            client_id: Client ID
            current_user: User deactivating the client
            
        Returns:
            Updated client data
        """
        from app.models.client import ClientStatus
        client_update = ClientUpdate(status=ClientStatus.INACTIVE)
        updated_client = self.update_client(client_id, client_update, current_user)

        # Update audit history with deactivate action
        self._create_audit_entry(
            client_id=client_id,
            action=HistoryAction.DEACTIVATE,
            old_values={"status": "Active"},
            new_values={"status": "Inactive"},
            changed_by=current_user.id
        )

        return updated_client

    def _client_to_dict(self, client: Client) -> Dict[str, Any]:
        """
        Convert client object to dictionary for audit logging.
        
        Args:
            client: Client object
            
        Returns:
            Dictionary representation of client
        """
        return {
            "id": client.id,
            "name": client.name,
            "client_type": client.client_type,
            "status": client.status,
            "relation_type": client.relation_type,
            "project_mgmt_tool": client.project_mgmt_tool,
            "comments": client.comments,
            "created_by": client.created_by,
            "updated_by": client.updated_by
        }

    def _create_audit_entry(
        self, 
        client_id: int, 
        action: HistoryAction, 
        old_values: Optional[Dict[str, Any]], 
        new_values: Optional[Dict[str, Any]], 
        changed_by: int
    ) -> None:
        """
        Create an audit history entry.
        
        Args:
            client_id: Client ID
            action: Action performed
            old_values: Previous values
            new_values: New values
            changed_by: User who made the change
        """
        history_entry = ClientHistory(
            client_id=client_id,
            action=action.value,
            old_values=old_values,
            new_values=new_values,
            changed_by=changed_by
        )

        self.db.add(history_entry)
        # Note: Don't commit here as this is called within other transactions