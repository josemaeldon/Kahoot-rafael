# Kahoot-rafael

A Kahoot clone application with TypeScript frontend and Rust backend.

## 🐳 Docker Setup

This project includes complete Docker configuration for easy development and deployment.

### Quick Start with Docker

1. **Clone the repository:**
   ```bash
   git clone https://github.com/josemaeldon/Kahoot-rafael.git
   cd Kahoot-rafael
   ```

2. **Start the application:**
   ```bash
   docker compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000

### Test Docker Setup

Run the included test script to validate your Docker configuration:
```bash
./test-docker.sh
```

For detailed Docker documentation, see [DOCKER.md](DOCKER.md).

## 📁 Project Structure

- `kahoot-clone-frontend/` - Next.js TypeScript frontend application
- `kahoot-clone-backend/` - Rust WebSocket server
- `kahoot-css/` - Styling resources
- `docker-compose.yml` - Docker orchestration configuration
- `DOCKER.md` - Detailed Docker documentation

## 🛠️ Development

### Prerequisites

- Docker and Docker Compose (recommended)
- Or: Node.js 18+, npm, and Rust 1.75+ for local development

### Frontend Development

```bash
cd kahoot-clone-frontend
npm install
npm run dev
```

### Backend Development

```bash
cd kahoot-clone-backend
cargo run
```

## 📚 Documentation

- [Docker Setup Guide](DOCKER.md) - Complete Docker configuration and usage guide
- [Frontend README](kahoot-clone-frontend/README.md) - Next.js specific documentation
