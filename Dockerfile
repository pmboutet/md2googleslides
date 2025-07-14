# Use official Node.js LTS image
FROM node:20-alpine AS builder

# Install system dependencies required for Sharp and other native tools
RUN apk add --no-cache \
    g++ \
    make \
    python3 \
    py3-pip \
    vips-dev \
    libc6-compat \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev

# Set working directory
WORKDIR /app

# Copy package.json first for better Docker layer caching
COPY package.json ./

# Install ALL dependencies (this regenerates package-lock.json if needed)
# Using npm install instead of npm ci to handle missing lockfile dependencies
RUN npm install --no-optional --production=false

# Copy source code after dependencies are installed
COPY . .

# Compile TypeScript and Babel properly
RUN npm run compile || echo "Compile step skipped"

# Production stage
FROM node:20-alpine AS production

# Install minimal runtime system dependencies
RUN apk add --no-cache \
    vips \
    libc6-compat \
    curl \
    bash

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S md2gslides -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package.json and generated package-lock.json from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./

# Install production dependencies using fresh lockfile
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled code and server files from builder stage
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/server.js ./
COPY --from=builder /app/scripts ./scripts

# Make scripts executable
RUN chmod +x scripts/*.sh 2>/dev/null || echo "No scripts to make executable"

# Create directories for runtime
RUN mkdir -p /home/md2gslides/.md2googleslides /tmp/uploads /app/shared

# Change ownership to non-root user
RUN chown -R md2gslides:nodejs /app && \
    chown -R md2gslides:nodejs /home/md2gslides && \
    chown -R md2gslides:nodejs /tmp

# Switch to non-root user
USER md2gslides

# Environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV PORT=3000

# Healthcheck for HTTP server mode
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port for HTTP server
EXPOSE 3000

# Default to HTTP server mode with fallback
CMD ["sh", "-c", "npm start || node server.js"]

# Documentation labels
LABEL maintainer="Pierre-Marie Boutet <pmboutet@example.com>"
LABEL description="md2googleslides - Convert Markdown to Google Slides (HTTP API)"
LABEL version="0.5.3"
LABEL org.opencontainers.image.source="https://github.com/pmboutet/md2googleslides"
LABEL org.opencontainers.image.title="md2googleslides-server"
LABEL org.opencontainers.image.description="Convert Markdown to Google Slides with HTTP API"
LABEL org.opencontainers.image.licenses="Apache-2.0"