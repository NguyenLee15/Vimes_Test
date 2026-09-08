# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root monorepo package manifests
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install all dependencies
RUN npm install

# Copy frontend source code
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js
RUN npm run build --workspace=@vimes/web

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install production dependencies
RUN npm install --omit=dev

# Copy Next.js build artifacts
COPY --from=builder /app/apps/web/.next ./apps/web/.next

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=@vimes/web"]

