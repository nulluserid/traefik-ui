FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Create non-root user and docker group access
RUN addgroup -g 1001 -S nodejs
RUN addgroup -g 999 -S docker
RUN adduser -S traefik-ui -u 1001 -G nodejs
RUN adduser traefik-ui docker

# Change ownership of the app directory
RUN chown -R traefik-ui:nodejs /app
USER traefik-ui

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/config', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["npm", "start"]