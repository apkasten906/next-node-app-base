# syntax=docker/dockerfile:1.4

ARG NODE_VERSION=25
ARG PNPM_VERSION=8.15.0

# Stage 1: Dependencies
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files
COPY apps/backend/package.json ./apps/backend/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    HUSKY=0 pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder
FROM node:${NODE_VERSION}-alpine AS builder
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy source code
COPY . .

# Ensure workspace deps are correctly linked in this stage
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    rm -rf node_modules apps/backend/node_modules && \
    HUSKY=0 pnpm install --frozen-lockfile --prod=false

# Generate Prisma client (Prisma 7 reads datasource URL from prisma.config.ts)
WORKDIR /app/apps/backend
RUN pnpm exec prisma generate --config /app/prisma.config.ts

# Build application
WORKDIR /app
RUN pnpm --filter @repo/types build && pnpm --filter backend build

# Stage 3: Production dependencies
FROM node:${NODE_VERSION}-alpine AS prod-deps
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files
COPY apps/backend/package.json ./apps/backend/
COPY packages/*/package.json ./packages/*/
COPY apps/backend/prisma ./apps/backend/prisma
COPY prisma.config.ts ./

# Install production dependencies (prune later)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    HUSKY=0 pnpm install --frozen-lockfile --prod

# Generate Prisma client for production deps
WORKDIR /app/apps/backend
RUN pnpm exec prisma generate --config /app/prisma.config.ts

WORKDIR /app

# Stage 4: Runner
FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install pnpm (needed for runtime commands like `pnpm exec prisma migrate deploy`)
RUN npm install -g pnpm@${PNPM_VERSION}

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Set environment variables
ENV NODE_ENV=production
ENV HUSKY=0

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/prisma ./apps/backend/prisma

# Copy built workspace packages required at runtime
COPY --from=builder --chown=nodejs:nodejs /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/types/dist ./packages/types/dist

# Copy package files
COPY --chown=nodejs:nodejs apps/backend/package.json ./apps/backend/
COPY --chown=nodejs:nodejs package.json ./
COPY --chown=nodejs:nodejs prisma.config.ts ./

# Ensure runtime-writable directories exist for non-root user
RUN mkdir -p /app/apps/backend/logs && chown -R nodejs:nodejs /app/apps/backend/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
WORKDIR /app/apps/backend
CMD ["node", "dist/index.js"]
