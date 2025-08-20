"""
Health check endpoints for monitoring system status.

This module provides health check endpoints for monitoring the application
and its dependencies like database connectivity.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import logging

from app.database import get_db, check_database_connection, get_database_info

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    
    Returns:
        dict: Application health status
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ClientOps Backend"
    }


@router.get("/health/database")
async def database_health_check(db: Session = Depends(get_db)):
    """
    Database connectivity health check.
    
    Args:
        db: Database session dependency
        
    Returns:
        dict: Database health status and connection info
        
    Raises:
        HTTPException: If database connection fails
    """
    try:
        # Test database connection with a simple query
        db.execute(text("SELECT 1"))
        db_info = get_database_info()
        
        return {
            "status": "healthy",
            "database": "connected",
            "connection_info": {
                "database": db_info["database"],
                "host": db_info["host"],
                "port": db_info["port"],
                "pool_size": db_info["pool_size"]
            }
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed: {str(e)}"
        )


@router.get("/health/database/detailed")
async def database_detailed_check():
    """
    Detailed database health check without using session dependency.
    
    Returns:
        dict: Detailed database health and configuration info
    """
    is_connected = check_database_connection()
    db_info = get_database_info()
    
    return {
        "status": "healthy" if is_connected else "unhealthy",
        "database": "connected" if is_connected else "disconnected",
        "configuration": db_info
    }