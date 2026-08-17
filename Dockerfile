# =============================================================================
# 🚀 Multi-stage Docker build for Intellica Monorepo (Coolify Ready)
# =============================================================================

# ── Stage 1: Build Frontend & Prepare Workspace ─────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Copy root monorepo and workspace package manifests
COPY package.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Install full workspace dependencies for building on Linux x64
RUN npm install --no-package-lock --include=optional

# Copy full source trees
COPY backend/ backend/
COPY frontend/ frontend/

# Build frontend production bundle (outputs to /app/frontend/dist)
RUN npm run build --workspace=frontend

# ── Stage 2: Production Server ──────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Install curl for container health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Copy root and backend package manifests
COPY package.json ./
COPY backend/package.json backend/

# Install production-only dependencies for the backend
RUN cd backend && npm install --omit=dev --no-package-lock

# Copy backend application source code
COPY backend/ backend/

# Copy compiled frontend production bundle from builder stage
COPY --from=builder /app/frontend/dist frontend/dist

# Create persistent storage folder for uploads and set permissions
RUN mkdir -p /app/backend/uploads && chmod 755 /app/backend/uploads

# Default production environment settings
ENV NODE_ENV=production

# Expose server port (configured in Coolify UI, default 5001)
EXPOSE 5001

# Persistent volume for faculty proof documents & profile photos
VOLUME ["/app/backend/uploads"]

# Container healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5001}/api/health || exit 1

# Start the unified Intellica server
CMD ["node", "backend/server.js"]
