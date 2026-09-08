# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root monorepo package manifests
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code of apps/api
COPY apps/api ./apps/api

# Build backend NestJS
RUN npm run build --workspace=@vimes/api

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled dist from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]

