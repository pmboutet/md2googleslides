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

# Copy package.json and install dependencies WITHOUT running scripts
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy all source files (including pre-compiled lib/ if it exists)
COPY . .

# Install express and multer directly if missing from lockfile
RUN npm install express@^4.21.2 multer@^1.4.5-lts.1 --save --ignore-scripts

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

# Start server directly
CMD ["node", "server.js"]

# Labels
LABEL maintainer="Pierre-Marie Boutet <pmboutet@example.com>"
LABEL description="md2googleslides HTTP API server"
LABEL version="0.5.3"