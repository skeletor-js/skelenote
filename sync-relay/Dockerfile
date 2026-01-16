# =============================================================================
# Skelenote Sync Relay - Docker Build
# =============================================================================
# Multi-stage build for a minimal, secure production image.
# Uses alpine for small footprint and non-root user for security.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 skelenote && \
    adduser -u 1001 -G skelenote -s /bin/sh -D skelenote

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory with proper permissions
RUN mkdir -p /data && chown -R skelenote:skelenote /data

# Switch to non-root user
USER skelenote

# Environment configuration
ENV PORT=8787
ENV DATA_DIR=/data
ENV NODE_ENV=production

# Expose the default port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8787/health || exit 1

# Run the server
CMD ["node", "dist/index.js"]
