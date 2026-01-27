# syntax=docker/dockerfile:1.4

ARG NODE_VERSION=25
ARG PNPM_VERSION=8.15.0

# Stage 1: Dependencies
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV HUSKY=0

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    HUSKY=0 pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder
FROM node:${NODE_VERSION}-alpine AS builder
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV HUSKY=0

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules

# Copy source code
COPY . .

# Ensure workspace deps are correctly linked in this stage
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    rm -rf node_modules apps/frontend/node_modules && \
    HUSKY=0 pnpm install --frozen-lockfile --prod=false

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build-time public env vars (baked into client bundle)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WEBSOCKET_URL=${NEXT_PUBLIC_WEBSOCKET_URL}

# Build application
RUN pnpm --filter @repo/types build && pnpm --filter frontend build

# Stage 3: Runner
FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app

ENV HUSKY=0

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application (Next.js standalone output)
CMD ["node", "apps/frontend/server.js"]
