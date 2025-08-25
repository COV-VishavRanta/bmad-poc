"""
Pydantic models for API request and response validation.

This module defines data models used for API serialization and validation
following the coding standards for type safety and documentation.
"""

from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    """Model for health check endpoint response."""
    
    status: str = Field(..., description="Service health status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="API version")
    database: str = Field(..., description="Database connection status")

    class Config:
        """Pydantic model configuration."""
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "service": "bmad-api",
                "version": "1.0.0",
                "database": "connected"
            }
        }


class RootResponse(BaseModel):
    """Model for root endpoint response."""
    
    message: str = Field(..., description="Welcome message")

    class Config:
        """Pydantic model configuration."""
        json_schema_extra = {
            "example": {
                "message": "B-MAD Client Ops API"
            }
        }