# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package first
RUN cd packages/shared && npm run build

# Build API
RUN cd apps/api && npm run build

# Debug: Show what was built
RUN echo "=== Contents of apps/api/dist ===" && ls -la apps/api/dist/ || echo "dist folder not found!"

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install ALL dependencies (needed for monorepo to work properly)
RUN npm install

# Copy built files from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy node_modules from builder (workspaces use root node_modules)
COPY --from=builder /app/node_modules ./node_modules

# Debug: Show what we have
RUN echo "=== Root directory ===" && ls -la && \
    echo "=== apps directory ===" && ls -la apps/ && \
    echo "=== apps/api directory ===" && ls -la apps/api/ && \
    echo "=== apps/api/dist directory ===" && ls -la apps/api/dist/ || echo "No dist!"

# Cloud Run expects the app to listen on PORT env variable
ENV PORT=8080
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Start the application from root
CMD ["node", "apps/api/dist/main.js"]

