# ClientOps - Client Operations Management System

A monorepo containing frontend (Next.js) and backend (FastAPI) applications with Docker containerization.

## 🏗️ Project Structure

```
clientops/
├── frontend/                    # Next.js frontend application (TypeScript)
├── backend/                     # FastAPI backend application (Python)
├── docs/                       # Project documentation
├── docker-compose.yml          # Docker orchestration
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ LTS
- **Python** 3.11+
- **Docker** & Docker Compose v2
- **MySQL** 8.0+ (for production) or Docker (for development)

### Development Setup

1. **Clone and setup environment:**
   ```bash
   git clone <repository>
   cd bmad-poc
   cp .env.example .env
   cp frontend/.env.local.example frontend/.env.local
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   
   pip install -r requirements.txt
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Verify Setup:**
   - Backend: http://localhost:8000/api/health
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

### Docker Setup

1. **Start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Start individual services:**
   ```bash
   # Database only
   docker-compose -f docker-compose.dev.yml up -d
   
   # All services
   docker-compose up frontend backend mysql
   ```

## 🛠️ Technology Stack

### Frontend
- **Next.js 15+** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Material-UI v5** - React component library

### Backend
- **FastAPI** - Modern Python web framework
- **Python 3.11+** - Programming language
- **SQLAlchemy 2.0+** - ORM and database toolkit
- **MySQL 8.0+** - Relational database

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## 📡 API Endpoints

### Health Check
- **GET** `/api/health` - Backend health status

### Available Services
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **MySQL:** localhost:3306 (when using Docker)

## 🌐 Environment Variables

### Backend (.env)
```env
# Database Configuration
MYSQL_DATABASE=clientops_db
MYSQL_USER=clientops_user
MYSQL_PASSWORD=secure_password
DATABASE_URL=mysql+pymysql://clientops_user:secure_password@mysql:3306/clientops_db

# Session Configuration
SESSION_SECRET_KEY=your-secret-key-here
SESSION_EXPIRE_MINUTES=1440

# Service URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### Frontend (.env.local)
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development
```

## 🧪 Testing

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## 📦 Docker Networks

- **Network:** `clientops-network`
- **Frontend:** `http://frontend:3000` (internal)
- **Backend:** `http://backend:8000` (internal)  
- **MySQL:** `mysql:3306` (internal)

## 🔧 Development Commands

```bash
# Backend development
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend development  
cd frontend
npm run dev

# Docker development
docker-compose up --build

# Stop all services
docker-compose down
```

## ✅ Features Implemented

- [x] Monorepo structure with frontend and backend
- [x] Next.js frontend with TypeScript and Tailwind CSS
- [x] FastAPI backend with Python 3.11+
- [x] Docker configuration for all services
- [x] Docker Compose orchestration
- [x] MySQL database integration
- [x] Environment configuration
- [x] Health check endpoints
- [x] Frontend-Backend communication
- [x] Hot reload support in development

## 📝 Next Steps

1. Add authentication system
2. Implement database models
3. Create API endpoints for business logic
4. Add comprehensive testing
5. Set up CI/CD pipeline
6. Add monitoring and logging

## 🐛 Troubleshooting

### Common Issues

1. **Docker not starting:** Ensure Docker Desktop is running
2. **Port conflicts:** Check if ports 3000, 8000, or 3306 are in use
3. **Permission errors:** On Linux/Mac, check file permissions
4. **Database connection:** Verify MySQL service is running and accessible

### Logs
```bash
# View container logs
docker-compose logs [service-name]

# Follow logs
docker-compose logs -f [service-name]
```

---

**Status:** ✅ Initial setup complete - Ready for development