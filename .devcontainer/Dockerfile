FROM node:18-bullseye

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
RUN npm install -g pnpm@8.15.0

# Install common global packages
RUN pnpm add -g \
    typescript \
    ts-node \
    nodemon \
    pm2

# Set up working directory
WORKDIR /workspace

# Configure git
RUN git config --global --add safe.directory /workspace

# Create non-root user
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Switch to non-root user
USER $USERNAME

# Set default shell
SHELL ["/bin/bash", "-c"]
