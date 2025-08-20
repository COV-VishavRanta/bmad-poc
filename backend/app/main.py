from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health

app = FastAPI(
    title="ClientOps API",
    description="A client operations management system API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "ClientOps API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)