"""
Health check endpoints for monitoring system status.

This module provides health check endpoints for monitoring the application
and its dependencies like database connectivity.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import DatabaseError, get_logger
from app.database import check_database_connection, get_database_info, get_db

router = APIRouter()
logger = get_logger(__name__)


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.

    Returns:
        dict: Application health status
    """
    logger.debug("Health check endpoint accessed")
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ClientOps Backend",
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
        DatabaseError: If database connection fails
    """
    try:
        # Test database connection with a simple query
        db.execute(text("SELECT 1"))
        db_info = get_database_info()

        logger.debug("Database health check successful")
        return {
            "status": "healthy",
            "database": "connected",
            "connection_info": {
                "database": db_info["database"],
                "host": db_info["host"],
                "port": db_info["port"],
                "pool_size": db_info["pool_size"],
            },
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise DatabaseError(
            message="Database health check failed",
            operation="health_check",
            details={"error": str(e)},
        )


@router.get("/health/database/detailed")
async def database_detailed_check():
    """
    Detailed database health check without using session dependency.

    Returns:
        dict: Detailed database health and configuration info
    """
    logger.debug("Detailed database health check accessed")
    is_connected = check_database_connection()
    db_info = get_database_info()

    status = "healthy" if is_connected else "unhealthy"
    if not is_connected:
        logger.warning("Database connection failed in detailed health check")

    return {
        "status": status,
        "database": "connected" if is_connected else "disconnected",
        "configuration": db_info,
    }
