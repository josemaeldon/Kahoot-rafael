# Docker Setup for Kahoot-rafael

This repository includes Docker configurations for both the frontend (Next.js TypeScript) and backend (Rust) applications.

## Prerequisites

- Docker
- Docker Compose

## Project Structure

```
Kahoot-rafael/
├── docker-compose.yml          # Orchestrates both services
├── kahoot-clone-frontend/      # Next.js TypeScript frontend
│   ├── Dockerfile              # Frontend container configuration
│   └── .dockerignore           # Files to exclude from Docker context
└── kahoot-clone-backend/       # Rust WebSocket server
    ├── Dockerfile              # Backend container configuration
    └── .dockerignore           # Files to exclude from Docker context
```

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and start both services:**
   ```bash
   docker compose up --build
   ```

2. **Start services in the background:**
   ```bash
   docker compose up -d --build
   ```

3. **Stop services:**
   ```bash
   docker compose down
   ```

### Using Docker individually

#### Frontend (Next.js TypeScript)

1. **Build the frontend image:**
   ```bash
   cd kahoot-clone-frontend
   docker build -t kahoot-frontend .
   ```

2. **Run the frontend container:**
   ```bash
   docker run -p 3000:3000 --name kahoot-frontend kahoot-frontend
   ```

3. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Backend (Rust WebSocket Server)

1. **Build the backend image:**
   ```bash
   cd kahoot-clone-backend
   docker build -t kahoot-backend .
   ```

2. **Run the backend container:**
   ```bash
   docker run -p 8000:8000 --name kahoot-backend -e RUST_LOG=info kahoot-backend
   ```

## Docker Configuration Details

### Frontend Dockerfile Features
- **Base Image:** Node.js 18 Alpine for minimal size
- **Multi-layered build:** Optimized for caching and size
- **Security:** Runs as non-root user (`nextjs`)
- **Build Process:** 
  - Copies package files and node_modules
  - Builds the TypeScript/Next.js application
  - Serves using `npm start`
- **Environment Variables:**
  - `NODE_ENV=production`
  - `NEXT_TELEMETRY_DISABLED=1`

### Backend Dockerfile Features
- **Multi-stage build:** Separates build and runtime environments
- **Build Stage:** Uses `rust:1.75-alpine` for compilation
- **Runtime Stage:** Uses minimal `alpine:3.18` for deployment
- **Security:** Runs as non-root user (`appuser`)
- **Build Process:**
  - Compiles Rust code in release mode
  - Creates minimal runtime image with only the binary
- **Environment Variables:**
  - `RUST_LOG=info`

### Docker Compose Configuration
- **Services:**
  - `frontend`: Next.js app on port 3000
  - `backend`: Rust WebSocket server on port 8000
- **Dependencies:** Frontend depends on backend
- **Environment:**
  - Frontend: `NEXT_PUBLIC_API_URL=http://localhost:8000`
  - Backend: `RUST_LOG=info`
- **Restart Policy:** `unless-stopped`

## Development Notes

### Network Considerations
- The docker-compose configuration creates a default network
- Services can communicate using their service names as hostnames
- External access is available through mapped ports (3000 for frontend, 8000 for backend)

### Volume Considerations
- No persistent volumes are currently configured
- All data is ephemeral and will be lost when containers are removed

### Performance Optimizations
- **Frontend:** Uses `.dockerignore` to exclude unnecessary files like `node_modules` during build context transfer
- **Backend:** Multi-stage build reduces final image size by excluding build dependencies
- **Caching:** Docker layer caching is optimized for both images

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Ensure ports 3000 and 8000 are not in use by other applications
   - Use `docker ps` to check running containers

2. **Build failures:**
   - Check network connectivity for package downloads
   - Ensure Docker has sufficient resources (memory/disk)

3. **Permission issues:**
   - Both containers run as non-root users for security
   - File permissions should be properly set during build

### Logs

- **View all logs:** `docker compose logs`
- **View frontend logs:** `docker compose logs frontend`
- **View backend logs:** `docker compose logs backend`
- **Follow logs:** Add `-f` flag to any log command

### Clean Up

- **Remove containers:** `docker compose down`
- **Remove images:** `docker compose down --rmi all`
- **Remove volumes:** `docker compose down -v`
- **Complete cleanup:** `docker system prune -a`

## Production Considerations

For production deployment, consider:

1. **Security:**
   - Use specific image tags instead of `latest`
   - Implement proper secrets management
   - Configure proper network policies

2. **Monitoring:**
   - Add health checks to Dockerfiles
   - Implement proper logging solutions
   - Monitor resource usage

3. **Scaling:**
   - Configure load balancers
   - Implement horizontal scaling strategies
   - Use orchestration platforms like Kubernetes

4. **Data Persistence:**
   - Configure volumes for persistent data
   - Implement backup strategies
   - Use managed databases if needed