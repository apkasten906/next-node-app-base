# Docker Deployment Guide

Complete guide for Docker containerization, local development with Docker Compose, and production deployment.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Production Dockerfiles](#production-dockerfiles)
- [Docker Compose Development](#docker-compose-development)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The monorepo includes production-ready Docker configurations:

- **Multi-stage Dockerfiles** - Optimized for size and security
- **Docker Compose** - Complete local development environment
- **GitHub Actions** - Automated image builds and security scanning
- **Security hardening** - Non-root users, minimal base images, vulnerability scanning

## Quick Start

### Local Development with Docker Compose

```bash
# Copy environment file
cp .env.docker.example .env

# Start all services
docker compose up

# Start specific services
docker compose up postgres redis

# Build and start
docker compose up --build

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

Access the applications:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Build Individual Images

```bash
# Frontend
docker build -f apps/frontend/Dockerfile -t next-node-frontend .

# Backend
docker build -f apps/backend/Dockerfile -t next-node-backend .
```

## Production Dockerfiles

### Frontend (Next.js)

**File:** `apps/frontend/Dockerfile`

**Features:**

- Multi-stage build (deps, builder, runner)
- Next.js standalone output mode
- Node.js 20 Alpine (minimal base)
- Non-root user (nextjs:nodejs)
- Health checks
- Build cache optimization with BuildKit

**Build:**

```bash
docker build -f apps/frontend/Dockerfile -t frontend:latest .
```

**Run:**

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://backend:3001 \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=your-secret \
  frontend:latest
```

**Image Size:** ~150MB (optimized with standalone mode)

### Backend (Node.js + Prisma)

**File:** `apps/backend/Dockerfile`

**Features:**

- Multi-stage build (deps, builder, prod-deps, runner)
- Prisma client generation
- Production dependencies only in final stage
- Node.js 20 Alpine
- Non-root user (nodejs)
- OpenSSL for Prisma
- Health checks

**Build:**

```bash
docker build -f apps/backend/Dockerfile -t backend:latest .
```

**Run:**

```bash
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:pass@postgres:5432/db \
  -e REDIS_URL=redis://:password@redis:6379 \
  -e JWT_SECRET=your-jwt-secret \
  backend:latest
```

**Image Size:** ~200MB

### .dockerignore Files

Both frontend and backend have `.dockerignore` files to reduce build context:

**Excluded:**

- `node_modules` (reinstalled in container)
- Tests and coverage
- Development files (.env.local, logs)
- IDE configurations
- Git files
- Documentation (except README)

## Docker Compose Development

### Services

**docker-compose.yml** includes:

1. **PostgreSQL** (postgres:16-alpine)
   - Port: 5432
   - Volume: postgres_data
   - Health checks
   - Init script support

2. **Redis** (redis:7-alpine)
   - Port: 6379
   - Password protected
   - Volume: redis_data
   - Health checks

3. **Backend** (Node.js API)
   - Port: 3001
   - Depends on: postgres, redis
   - Auto-runs migrations
   - Volume mounts for development

4. **Frontend** (Next.js)
   - Port: 3000
   - Depends on: backend
   - Volume mounts for development

### Configuration

**Environment Variables** (`.env`):

```env
# PostgreSQL
POSTGRES_USER=devuser
POSTGRES_PASSWORD=devpassword
POSTGRES_DB=nextnode_dev
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=devredis
REDIS_PORT=6379

# Application
NODE_ENV=development

# JWT & Auth
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-change-in-production
SESSION_SECRET=dev-session-secret-change-in-production
NEXTAUTH_SECRET=dev-nextauth-secret-change-in-production
```

### Common Commands

```bash
# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f backend

# Execute commands in containers
docker compose exec backend sh
docker compose exec postgres psql -U devuser -d nextnode_dev

# Restart services
docker compose restart backend

# Remove all containers and volumes
docker compose down -v

# Rebuild specific service
docker compose up --build backend
```

### Development Workflow

1. **Initial Setup:**

   ```bash
   cp .env.docker.example .env
   docker compose up -d postgres redis
   # Wait for health checks
   docker compose up backend frontend
   ```

2. **Code Changes:**
   - Backend changes: Restart backend service
   - Frontend changes: Hot reload works with volume mount
   - Database schema: Run migrations manually

3. **Database Migrations:**

   ```bash
   docker compose exec backend pnpm exec prisma migrate dev
   ```

4. **Reset Database:**
   ```bash
   docker compose down -v
   docker compose up -d
   ```

## GitHub Actions CI/CD

### Workflow: docker-build.yml

**File:** `.github/workflows/docker-build.yml`

**Triggers:**

- Push to `master`/`main`
- Pull requests
- Tags (`v*`)
- Manual workflow dispatch

**Jobs:**

1. **build-frontend**
   - Builds frontend Docker image
   - Pushes to GitHub Container Registry (ghcr.io)
   - Multi-platform: linux/amd64, linux/arm64
   - Build cache with GitHub Actions cache

2. **build-backend**
   - Builds backend Docker image
   - Pushes to ghcr.io
   - Multi-platform support
   - Build cache optimization

3. **security-scan**
   - Runs Trivy vulnerability scanner
   - Scans both images
   - Uploads results to GitHub Security
   - Fails on CRITICAL/HIGH vulnerabilities

**Image Tags:**

- `latest` - Latest from default branch
- `v1.2.3` - Semantic version tags
- `v1.2` - Major.minor tags
- `v1` - Major version tags
- `main-abc123` - Branch + commit SHA
- `pr-123` - Pull request number

### Pull Images

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull frontend
docker pull ghcr.io/apkasten906/next-node-app-base/frontend:latest

# Pull backend
docker pull ghcr.io/apkasten906/next-node-app-base/backend:latest
```

### Manual Workflow Dispatch

Trigger builds manually from GitHub Actions UI with option to push images.

## Security Best Practices

### 1. Non-Root Users

Both Dockerfiles run as non-root users:

**Frontend:**

```dockerfile
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs
```

**Backend:**

```dockerfile
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
USER nodejs
```

### 2. Minimal Base Images

- Using Alpine Linux (5MB base)
- Node.js 20 Alpine images
- No unnecessary packages

### 3. Multi-Stage Builds

- Separate build and runtime stages
- Production dependencies only in final stage
- Smaller attack surface

### 4. Vulnerability Scanning

- Trivy scans in CI/CD
- Automated security updates
- SARIF reports to GitHub Security

### 5. Secrets Management

**Never commit secrets to Docker images:**

```dockerfile
# ❌ Bad
ENV JWT_SECRET=hardcoded-secret

# ✅ Good - Use environment variables at runtime
ENV JWT_SECRET=${JWT_SECRET}
```

**In production:**

- Use Kubernetes Secrets
- AWS Secrets Manager
- HashiCorp Vault

### 6. Health Checks

All images include health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### 7. Build Cache Optimization

Using BuildKit cache mounts:

```dockerfile
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
```

### 8. Image Signing (Future)

Consider implementing Cosign for image signing:

```bash
cosign sign ghcr.io/apkasten906/next-node-app-base/frontend:latest
```

## Troubleshooting

### Issue: Build fails with "no space left on device"

**Solution:**

```bash
# Clean Docker system
docker system prune -a

# Remove build cache
docker builder prune -a
```

### Issue: Permission denied errors

**Solution:**
Ensure volumes have correct permissions:

```bash
# Fix permissions
docker compose run --rm backend chown -R nodejs:nodejs /app
```

### Issue: Database connection fails

**Solution:**

1. Check health status: `docker compose ps`
2. Verify DATABASE_URL environment variable
3. Check PostgreSQL logs: `docker compose logs postgres`
4. Ensure migrations ran: `docker compose exec backend pnpm exec prisma migrate status`

### Issue: Frontend can't connect to backend

**Solution:**

1. Verify NEXT_PUBLIC_API_URL points to backend service name
2. Check network: `docker network inspect next-node-app-base_app-network`
3. Test backend health: `docker compose exec frontend wget -O- http://backend:3001/health`

### Issue: Slow builds

**Solutions:**

1. Enable BuildKit: `export DOCKER_BUILDKIT=1`
2. Use build cache: `docker compose build --cache-from=...`
3. Reduce build context with .dockerignore
4. Use multi-stage builds (already implemented)

### Issue: Image size too large

**Solutions:**

1. Verify .dockerignore excludes node_modules, tests, etc.
2. Use Alpine base images (already implemented)
3. Remove dev dependencies in production stage (already implemented)
4. Check image layers: `docker history <image>`

## Production Deployment

### Kubernetes

See `docs/kubernetes/` for Kubernetes manifests.

**Basic deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: ghcr.io/apkasten906/next-node-app-base/frontend:latest
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_API_URL
              value: 'http://backend-service:3001'
            - name: NEXTAUTH_SECRET
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: nextauth-secret
```

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml next-node-app
```

### Environment-Specific Builds

```bash
# Development
docker build --target runner -f apps/backend/Dockerfile -t backend:dev .

# Production with build args
docker build \
  --build-arg NODE_ENV=production \
  -f apps/backend/Dockerfile \
  -t backend:prod .
```

## Performance Optimization

### Build Performance

1. **Layer caching** - Order COPY commands from least to most frequently changing
2. **Parallel builds** - `docker compose build --parallel`
3. **Build cache** - Use GitHub Actions cache or local BuildKit cache

### Runtime Performance

1. **Resource limits** in docker-compose.yml:

   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.5'
         memory: 512M
   ```

2. **Connection pooling** - Already configured in backend
3. **Health checks** - Prevent routing to unhealthy containers

## Monitoring

### Container Metrics

```bash
# Resource usage
docker stats

# Specific service
docker compose stats backend

# Logs with timestamps
docker compose logs -f --timestamps backend
```

### Health Status

```bash
# Check health
docker compose ps

# Inspect health
docker inspect --format='{{.State.Health.Status}}' next-node-backend
```

## Next Steps

- [ ] Set up container registry authentication
- [ ] Configure production environment variables
- [ ] Implement image signing with Cosign
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation (ELK, Loki)
- [ ] Implement blue-green deployments
- [ ] Set up automated backups for volumes
