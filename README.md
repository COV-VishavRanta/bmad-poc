# B-MAD Client Ops - Project Setup & Infrastructure

A containerized monorepo for the ClientOps resource and project management system with Next.js frontend and FastAPI backend connected to MySQL database.

## Quick Start

1. **Prerequisites**
   - Node.js 18+ and npm
   - Python 3.11+
   - Docker and Docker Compose (for containerized deployment)

2. **Local Development**
   ```bash
   # Clone and setup
   git clone <repository-url>
   cd bmad-poc
   
   # Backend setup
   cd backend
   python -m venv venv
   venv\Scripts\activate  # On Windows
   pip install -r requirements.txt
   python main.py
   
   # Frontend setup (new terminal)
   cd frontend
   npm install
   npm run dev
   ```

3. **Docker Deployment**
   ```bash
   docker-compose up --build
   ```

## Architecture

```
bmad-poc/
├── README.md                    # This file
├── DEVELOPMENT.md              # Detailed setup instructions
├── docker-compose.yml         # Service orchestration
├── .env.example               # Environment template
├── .env                       # Local environment variables
├── frontend/                  # Next.js TypeScript application
│   ├── src/
│   │   └── app/
│   │       ├── layout.tsx     # Root layout
│   │       ├── page.tsx       # Home page with API test
│   │       └── globals.css    # Global styles
│   ├── package.json           # Dependencies and scripts
│   ├── tsconfig.json         # TypeScript configuration
│   ├── next.config.js        # Next.js configuration
│   └── Dockerfile            # Frontend container
└── backend/                   # FastAPI Python application
    ├── main.py               # FastAPI application entry point
    ├── app/
    │   ├── database.py       # Database connection setup
    │   └── __init__.py
    ├── requirements.txt      # Python dependencies
    └── Dockerfile           # Backend container
```

## Services

- **Frontend**: Next.js 14.2.5 with TypeScript (Port 3000)
- **Backend**: FastAPI with uvicorn (Port 8000)
- **Database**: MySQL 8.0 (Port 3306)

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

## Environment Variables

See `.env.example` for required environment variables:
- Database connection settings
- API URLs
- Service configuration

## Verification

1. Frontend: http://localhost:3000
2. Backend API: http://localhost:8000/health
3. Backend Docs: http://localhost:8000/docs

The frontend includes a health check component that tests backend connectivity.