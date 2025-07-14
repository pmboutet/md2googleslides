# Simple Dockerfile for md2googleslides HTTP server
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    vips \
    libc6-compat

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S md2gslides -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy all source files
COPY . .

# Create necessary directories
RUN mkdir -p /tmp/uploads /app/shared /home/md2gslides/.md2googleslides

# Change ownership
RUN chown -R md2gslides:nodejs /app /tmp /home/md2gslides

# Switch to non-root user
USER md2gslides

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start server (fallback to node if npm fails)
CMD ["sh", "-c", "node server.js"]

# Labels
LABEL maintainer="Pierre-Marie Boutet <pmboutet@example.com>"
LABEL description="md2googleslides HTTP API server"
LABEL version="0.5.3"