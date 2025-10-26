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

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm install --production

# Copy built files from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Set working directory to API
WORKDIR /app/apps/api

# Cloud Run expects the app to listen on PORT env variable
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "dist/main.js"]

