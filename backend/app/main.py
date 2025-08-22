import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, auth, users, clients, projects
from app.core import (
    CORSLoggingMiddleware,
    LoggingMiddleware,
    SecurityHeadersMiddleware,
    get_logger,
    register_exception_handlers,
    setup_logging,
)
from app.middleware import AuthenticationMiddleware

# Set up logging before creating the app
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(
        "ClientOps API starting up",
        extra={
            "environment": os.getenv("ENVIRONMENT", "development"),
            "version": "1.0.0",
        },
    )
    yield
    # Shutdown
    logger.info("ClientOps API shutting down")


app = FastAPI(
    title="ClientOps API",
    description="A client operations management system API",
    version="1.0.0",
    lifespan=lifespan,
)

# Register exception handlers
register_exception_handlers(app)

# Add custom middleware (order matters!)
app.add_middleware(AuthenticationMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware, skip_paths=["/docs", "/redoc", "/openapi.json", "/"])
app.add_middleware(CORSLoggingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend URL
        "http://frontend:3000",   # Docker frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, tags=["auth"])
app.include_router(users.router, tags=["users"])
app.include_router(clients.router, tags=["clients"])
app.include_router(projects.router, tags=["projects"])


@app.get("/")
async def root():
    """Root endpoint"""
    logger.debug("Root endpoint accessed")
    return {"message": "ClientOps API is running", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
