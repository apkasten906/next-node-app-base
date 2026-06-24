FROM node:25-bookworm

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    curl \
    wget \
    vim \
    nano \
    postgresql-client \
    redis-tools \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@11.1.3

# pnpm 9+ requires PNPM_HOME to be set and in PATH before global installs.
# Use a system-wide location so all users in the container can run the binaries.
ENV PNPM_HOME="/usr/local/share/pnpm"
ENV PATH="${PNPM_HOME}/bin:${PATH}"

# Install common global packages
RUN pnpm add -g \
    typescript \
    ts-node \
    nodemon \
    pm2

# Set up working directory
WORKDIR /workspace

# Pre-create node_modules so the named volume is initialised with the correct
# ownership.  This must happen while still running as root (before USER).
RUN mkdir -p /workspace/node_modules && chown -R node:node /workspace/node_modules

# Seed ownership for the persistent Codex volume. Docker copies this directory's
# metadata into a new named volume, allowing the non-root node user to write it.
RUN mkdir -p /home/node/.codex && chown -R node:node /home/node/.codex

# Switch to non-root user (already exists in the base image)
USER node
