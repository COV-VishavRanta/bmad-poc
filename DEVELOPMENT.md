# Development Setup Guide

This document provides detailed setup instructions for the B-MAD Client Ops development environment.

## System Requirements

- **Node.js**: Version 18.0.0 or higher
- **Python**: Version 3.11 or higher
- **Docker**: Latest version with Docker Compose
- **Git**: For version control

## Development Environment Setup

### 1. Repository Setup

```bash
git clone <repository-url>
cd bmad-poc
cp .env.example .env
```

### 2. Backend Development Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start development server
python main.py
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Development Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 4. Database Setup

For local development, the application is configured to work with either:
- Local MySQL instance (configure DATABASE_URL in .env)
- Docker Compose MySQL service

### 5. Docker Development

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Project Structure

```
bmad-poc/
├── .env                       # Environment variables (local)
├── .env.example              # Environment template
├── docker-compose.yml        # Service orchestration
├── README.md                 # Project overview
├── DEVELOPMENT.md           # This file
│
├── frontend/                # Next.js Frontend
│   ├── src/
│   │   └── app/
│   │       ├── layout.tsx   # Root layout component
│   │       ├── page.tsx     # Home page with API connectivity test
│   │       └── globals.css  # Global styles
│   ├── package.json         # Node.js dependencies and scripts
│   ├── tsconfig.json       # TypeScript configuration
│   ├── next.config.js      # Next.js configuration
│   └── Dockerfile          # Frontend container definition
│
└── backend/                 # FastAPI Backend
    ├── main.py             # Application entry point
    ├── app/
    │   ├── __init__.py
    │   └── database.py     # Database connection utilities
    ├── requirements.txt    # Python dependencies
    └── Dockerfile         # Backend container definition
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database Configuration
MYSQL_ROOT_PASSWORD=password
MYSQL_DATABASE=bmad_db
MYSQL_USER=bmad_user
MYSQL_PASSWORD=bmad_password

# Backend Configuration
DATABASE_URL=mysql+pymysql://bmad_user:bmad_password@localhost:3306/bmad_db

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Database Configuration

The application uses SQLAlchemy for database operations. Connection settings:
- **Development**: Configure DATABASE_URL in `.env`
- **Docker**: Automatic configuration via docker-compose

## Development Workflow

1. **Start Backend**: `cd backend && python main.py`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Verify Connectivity**: Visit http://localhost:3000 and check API status

## API Documentation

- **Interactive API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Root Endpoint**: http://localhost:8000/

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Backend (8000): Check for running Python processes
   - Frontend (3000): Check for running Node.js processes
   - Database (3306): Check for running MySQL instances

2. **Database Connection Issues**
   - Verify DATABASE_URL in .env file
   - Ensure MySQL service is running
   - Check firewall and port access

3. **Frontend API Connection Issues**
   - Verify NEXT_PUBLIC_API_URL in .env.local
   - Check CORS configuration in backend
   - Ensure backend is running and accessible

### Docker Issues

1. **Build Failures**
   - Ensure Docker Desktop is running
   - Check Dockerfile syntax
   - Verify requirements.txt and package.json

2. **Service Communication**
   - Check docker-compose network configuration
   - Verify service names and ports
   - Review environment variable passing

## Next Steps

After successful setup:
1. Verify all services are running
2. Test API connectivity from frontend
3. Review application logs for any issues
4. Begin feature development following the project requirements