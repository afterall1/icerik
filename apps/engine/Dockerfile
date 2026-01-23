# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ gcc

# Copy package files
COPY package*.json ./
COPY apps/engine/package*.json ./apps/engine/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=@icerik/engine --include-workspace-root

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/engine ./apps/engine
COPY tsconfig*.json ./

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build || echo "No build script in shared"

# Build engine
WORKDIR /app/apps/engine
RUN npm run build

# ============================================================
# Production stage
# ============================================================

FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ gcc

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 hono

# Copy package files
COPY package*.json ./
COPY apps/engine/package*.json ./apps/engine/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm ci --workspace=@icerik/engine --include-workspace-root --omit=dev

# Copy built files
COPY --from=builder /app/apps/engine/dist ./apps/engine/dist
COPY --from=builder /app/packages/shared ./packages/shared

# Copy environment example (actual .env provided at runtime)
COPY apps/engine/.env.example ./apps/engine/.env.example

# Create data directory for SQLite
RUN mkdir -p /app/apps/engine/data \
    && chown -R hono:nodejs /app

# Switch to non-root user
USER hono

WORKDIR /app/apps/engine

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Environment variables with defaults
ENV NODE_ENV=production \
    PORT=3000

# Start the application
CMD ["node", "dist/index.js"]
