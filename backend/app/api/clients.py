"""
Client management API endpoints.

This module provides API endpoints for client CRUD operations,
including listing, creating, updating, and deleting clients.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse,
    ClientWithHistory, ClientSearchParams
)
from app.services.client_service import ClientService
from app.utils.middleware import require_auth
from app.models.user import User

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
) -> ClientResponse:
    """
    Create a new client.
    
    Args:
        client_data: Client creation data
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Created client data
        
    Raises:
        HTTPException: 403 if insufficient permissions, 409 if name exists
    """
    client_service = ClientService(db)
    return client_service.create_client(client_data, current_user)


@router.get("/", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    search: str = Query(None, description="Search in name, relation type, and comments"),
    client_type: str = Query(None, description="Filter by client type"),
    status: str = Query(None, description="Filter by client status"),
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
) -> ClientListResponse:
    """
    List clients with filtering and pagination.
    
    Args:
        page: Page number (default: 1)
        limit: Items per page (default: 50, max: 100)
        search: Search term for name, relation type, and comments
        client_type: Filter by client type (Customer, Partner, Internal)
        status: Filter by status (Active, Inactive)
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Paginated list of clients with metadata
        
    Raises:
        HTTPException: 403 if insufficient permissions
    """
    # Create search parameters with validation
    try:
        params = ClientSearchParams(
            page=page,
            limit=limit,
            search=search,
            client_type=client_type,
            status=status
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    
    client_service = ClientService(db)
    return client_service.list_clients(params, current_user)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
) -> ClientResponse:
    """
    Get a specific client by ID.
    
    Args:
        client_id: Client ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Client data
        
    Raises:
        HTTPException: 404 if client not found, 403 if insufficient permissions
    """
    client_service = ClientService(db)
    return client_service.get_client(client_id, current_user)


@router.get("/{client_id}/history", response_model=ClientWithHistory)
async def get_client_with_history(
    client_id: int,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
) -> ClientWithHistory:
    """
    Get a client with complete audit history.
    
    Args:
        client_id: Client ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Client data with audit history
        
    Raises:
        HTTPException: 404 if client not found, 403 if insufficient permissions
    """
    client_service = ClientService(db)
    return client_service.get_client_with_history(client_id, current_user)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
) -> ClientResponse:
    """
    Update an existing client.
    
    Args:
        client_id: Client ID
        client_data: Updated client data
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Updated client data
        
    Raises:
        HTTPException: 404 if client not found, 403 if insufficient permissions, 
                      409 if name conflict
    """
    client_service = ClientService(db)
    return client_service.update_client(client_id, client_data, current_user)


@router.delete("/{client_id}")
async def delete_client(
    client_id: int,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Delete a client.
    
    Args:
        client_id: Client ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Deletion confirmation message
        
    Raises:
        HTTPException: 404 if client not found, 403 if insufficient permissions,
                      409 if client has active projects
    """
    client_service = ClientService(db)
    return client_service.delete_client(client_id, current_user)


@router.patch("/{client_id}/deactivate", response_model=ClientResponse)
async def deactivate_client(
    client_id: int,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
) -> ClientResponse:
    """
    Deactivate a client instead of deleting.
    
    This is the preferred method for clients with existing projects
    or other dependencies that prevent deletion.
    
    Args:
        client_id: Client ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Updated client data with inactive status
        
    Raises:
        HTTPException: 404 if client not found, 403 if insufficient permissions
    """
    client_service = ClientService(db)
    return client_service.deactivate_client(client_id, current_user)