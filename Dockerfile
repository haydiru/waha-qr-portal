# ==============================================================================
# WAHA SENTINEL GATEWAY — PRODUCTION DOCKERFILE (COOLIFY OPTIMIZED)
# Base: Node.js 20 LTS Alpine (Hardened, Non-root, <35MB RAM footprint)
# ==============================================================================

FROM node:20-alpine AS base

# Install curl/wget for healthcheck
RUN apk add --no-cache wget

# Create application directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY server.js ./
COPY public/ ./public/

# Security hardening: use non-root user
USER node

# Ingress container port
EXPOSE 3000

# Healthcheck for Coolify / Traefik container monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start microservice daemon
CMD ["node", "server.js"]
