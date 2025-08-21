"""
Client management API endpoints.

This module provides REST API endpoints for client CRUD operations,
contact management, search/filtering, and audit trail access.
"""

import math
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware import require_auth
from app.models.user import User
from app.schemas.client import (
    ClientCreateRequest,
    ClientUpdateRequest,
    ClientResponse,
    ClientListResponse,
    ClientSearchParams,
    ClientHistoryResponse,
    ClientContactCreateRequest,
    ClientContactUpdateRequest,
    ClientContactResponse,
    ClientDeleteResponse,
    ClientError,
)
from app.services.client_service import (
    ClientService,
    ClientServiceError,
    ClientNotFoundError,
    ClientNameExistsError,
    ClientHasDependenciesError,
    ContactNotFoundError,
)

router = APIRouter(prefix="/api/clients", tags=["clients"])


def get_client_service(db: Session = Depends(get_db)) -> ClientService:
    """Dependency to get client service instance."""
    return ClientService(db)


# Client CRUD endpoints
@router.post(
    "/",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new client",
    description="Create a new client with validation and audit trail",
)
async def create_client(
    client_data: ClientCreateRequest,
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> ClientResponse:
    """
    Create a new client.

    - **name**: Client name (required, must be unique)
    - **status**: Client status (active/inactive)
    - **relation_type**: Relationship type (Customer/Partner/Internal)
    - **project_management_tool**: Optional project management tool
    - **comments**: Optional additional comments
    """
    try:
        client = client_service.create_client(client_data, current_user.id)
        return ClientResponse.model_validate(client)
    except ClientNameExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
                "details": {"field_errors": {"name": [e.message]}},
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


@router.get(
    "/",
    response_model=ClientListResponse,
    summary="List clients with search and filtering",
    description="Get paginated list of clients with optional search and filtering",
)
async def list_clients(
    search: Optional[str] = Query(None, description="Search in name and comments"),
    status: Optional[str] = Query(None, description="Filter by status"),
    relation_type: Optional[str] = Query(None, description="Filter by relation type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("name", description="Sort field"),
    sort_order: str = Query("asc", description="Sort order"),
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> ClientListResponse:
    """
    Get paginated list of clients.

    Supports:
    - **search**: Search in client name and comments
    - **status**: Filter by client status (active/inactive)
    - **relation_type**: Filter by relation type (Customer/Partner/Internal)
    - **pagination**: Page-based pagination
    - **sorting**: Sort by name, created_at, or updated_at
    """
    try:
        # Create search parameters
        search_params = ClientSearchParams(
            search=search,
            status=status,
            relation_type=relation_type,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        
        clients, total = client_service.search_clients(search_params)
        
        pages = math.ceil(total / page_size) if total > 0 else 1
        
        client_responses = [ClientResponse.model_validate(client) for client in clients]
        
        return ClientListResponse(
            clients=client_responses,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


@router.get(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Get client by ID",
    description="Retrieve a single client with contacts",
)
async def get_client(
    client_id: int,
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> ClientResponse:
    """
    Get a client by ID.

    Returns the client with all associated contacts.
    """
    try:
        client = client_service.get_client(client_id, include_contacts=True)
        return ClientResponse.model_validate(client)
    except ClientNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


@router.put(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Update client",
    description="Update client information with validation and audit trail",
)
async def update_client(
    client_id: int,
    client_data: ClientUpdateRequest,
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> ClientResponse:
    """
    Update a client.

    Only provided fields will be updated. Maintains audit trail of changes.
    """
    try:
        client = client_service.update_client(client_id, client_data, current_user.id)
        return ClientResponse.model_validate(client)
    except ClientNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )
    except ClientNameExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
                "details": {"field_errors": {"name": [e.message]}},
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


@router.delete(
    "/{client_id}",
    response_model=ClientDeleteResponse,
    summary="Delete client",
    description="Delete client with dependency checking",
)
async def delete_client(
    client_id: int,
    force: bool = Query(False, description="Force soft delete if dependencies exist"),
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> ClientDeleteResponse:
    """
    Delete a client.

    - **force**: If true, deactivates client instead of deletion when dependencies exist
    - Checks for active projects and other dependencies before deletion
    - Creates audit trail of deletion
    """
    try:
        client_service.delete_client(client_id, current_user.id, force=force)
        
        message = "Client deleted successfully"
        if force:
            message = "Client deactivated due to dependencies"
            
        return ClientDeleteResponse(
            status="success",
            message=message,
            client_id=client_id,
        )
    except ClientNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )
    except ClientHasDependenciesError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
                "details": {"force_delete_available": True},
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


# Client history endpoint
@router.get(
    "/{client_id}/history",
    response_model=List[ClientHistoryResponse],
    summary="Get client history",
    description="Retrieve audit trail for a client",
)
async def get_client_history(
    client_id: int,
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> List[ClientHistoryResponse]:
    """
    Get client audit history.

    Returns chronological list of all changes made to the client.
    """
    try:
        history = client_service.get_client_history(client_id)
        return [ClientHistoryResponse.model_validate(record) for record in history]
    except ClientNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


# Contact management endpoints
@router.get(
    "/{client_id}/contacts",
    response_model=List[ClientContactResponse],
    summary="Get client contacts",
    description="Retrieve all contacts for a client",
)
async def get_client_contacts(
    client_id: int,
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> List[ClientContactResponse]:
    """
    Get all contacts for a client.

    Returns contacts ordered by primary contact first, then by name.
    """
    try:
        contacts = client_service.get_client_contacts(client_id)
        return [ClientContactResponse.model_validate(contact) for contact in contacts]
    except ClientNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


@router.post(
    "/{client_id}/contacts",
    response_model=ClientContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create client contact",
    description="Create a new contact for a client",
)
async def create_client_contact(
    client_id: int,
    contact_data: ClientContactCreateRequest,
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> ClientContactResponse:
    """
    Create a new contact for a client.

    - **name**: Contact name (required)
    - **email**: Contact email (optional)
    - **phone**: Contact phone (optional)
    - **role**: Contact role/position (optional)
    - **is_primary**: Whether this is the primary contact
    """
    try:
        contact = client_service.create_contact(client_id, contact_data, current_user.id)
        return ClientContactResponse.model_validate(contact)
    except ClientNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


@router.put(
    "/{client_id}/contacts/{contact_id}",
    response_model=ClientContactResponse,
    summary="Update client contact",
    description="Update an existing client contact",
)
async def update_client_contact(
    client_id: int,
    contact_id: int,
    contact_data: ClientContactUpdateRequest,
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> ClientContactResponse:
    """
    Update a client contact.

    Only provided fields will be updated.
    """
    try:
        contact = client_service.update_contact(contact_id, contact_data, current_user.id)
        return ClientContactResponse.model_validate(contact)
    except ContactNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


@router.delete(
    "/{client_id}/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete client contact",
    description="Delete a client contact",
)
async def delete_client_contact(
    client_id: int,
    contact_id: int,
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> None:
    """
    Delete a client contact.

    Permanently removes the contact from the client.
    """
    try:
        client_service.delete_contact(contact_id, current_user.id)
    except ContactNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


@router.post(
    "/{client_id}/activate",
    response_model=ClientResponse,
    summary="Activate client",
    description="Activate a deactivated client",
)
async def activate_client(
    client_id: int,
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> ClientResponse:
    """
    Activate a client.

    Changes client status to active and records the action in audit trail.
    """
    try:
        client = client_service.activate_client(client_id, current_user.id)
        return ClientResponse.model_validate(client)
    except ClientNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )


@router.post(
    "/{client_id}/deactivate",
    response_model=ClientResponse,
    summary="Deactivate client",
    description="Deactivate an active client",
)
async def deactivate_client(
    client_id: int,
    current_user: User = Depends(require_auth),
    client_service: ClientService = Depends(get_client_service),
) -> ClientResponse:
    """
    Deactivate a client.

    Changes client status to inactive and records the action in audit trail.
    """
    try:
        client = client_service.deactivate_client(client_id, current_user.id)
        return ClientResponse.model_validate(client)
    except ClientNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )
    except ClientServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "message": e.message,
                "code": e.code,
            },
        )