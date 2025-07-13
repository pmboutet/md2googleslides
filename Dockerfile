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

# Copy package files
COPY package.json ./
COPY yarn.lock* package-lock.json* ./

# Install dependencies without running lifecycle scripts
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Compile TypeScript and Babel properly
RUN npm run compile

# Production stage
FROM node:20-alpine AS production

# Install minimal runtime system dependencies
RUN apk add --no-cache \
    vips \
    libc6-compat \
    curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S md2gslides -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files from builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./

# Install only production dependencies without running lifecycle scripts
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled code from builder stage
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/bin ./bin

# Copy scripts
COPY scripts/ ./scripts/

# Make scripts executable
RUN chmod +x scripts/*.sh

# Create directory for Google credentials
RUN mkdir -p /home/md2gslides/.md2googleslides

# Change ownership to non-root user
RUN chown -R md2gslides:nodejs /app && \
    chown -R md2gslides:nodejs /home/md2gslides

# Switch to non-root user
USER md2gslides

# Environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD scripts/healthcheck.sh

# Expose port (if needed for future API)
EXPOSE 3000

# Entry point
ENTRYPOINT ["node", "bin/md2gslides.js"]

# Default command
CMD ["--help"]

# Documentation labels
LABEL maintainer="Pierre-Marie Boutet <pmboutet@example.com>"
LABEL description="md2googleslides - Convert Markdown to Google Slides"
LABEL version="0.5.3"
LABEL org.opencontainers.image.source="https://github.com/pmboutet/md2googleslides"
LABEL org.opencontainers.image.title="md2googleslides"
LABEL org.opencontainers.image.description="Convert Markdown to Google Slides"
LABEL org.opencontainers.image.licenses="Apache-2.0"