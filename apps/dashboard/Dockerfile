# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/dashboard/package*.json ./apps/dashboard/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=dashboard --include-workspace-root

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/dashboard ./apps/dashboard

# Build the application
WORKDIR /app/apps/dashboard
RUN npm run build

# ============================================================
# Production stage - Nginx
# ============================================================

FROM nginx:alpine AS runner

# Copy custom nginx config
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
