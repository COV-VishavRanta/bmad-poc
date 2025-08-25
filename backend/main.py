"""
B-MAD Client Ops API

FastAPI application for resource and project management system.
Provides health check endpoints, authentication, and database connectivity.
"""

import os
from typing import Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.schemas.response import HealthCheckResponse, RootResponse
from app.api.auth import router as auth_router
from app.database import create_tables

# Load environment variables
load_dotenv()

app = FastAPI(
    title="B-MAD Client Ops API",
    description="Resource and project management system API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    """Create database tables on application startup."""
    create_tables()


@app.get("/", response_model=RootResponse)
async def root() -> RootResponse:
    """
    Root endpoint providing basic API information.
    
    Returns:
        RootResponse containing welcome message
    """
    return RootResponse(message="B-MAD Client Ops API")


@app.get("/health", response_model=HealthCheckResponse)
async def health_check() -> HealthCheckResponse:
    """
    Health check endpoint for monitoring API status.
    
    Returns:
        HealthCheckResponse containing service status, version, and database connectivity
    """
    database_url = os.getenv("DATABASE_URL")
    
    return HealthCheckResponse(
        status="healthy",
        service="bmad-api",
        version="1.0.0",
        database="connected" if database_url else "not_configured"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)