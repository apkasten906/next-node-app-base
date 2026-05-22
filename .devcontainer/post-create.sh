#!/bin/bash

set -e

echo "🚀 Running post-create setup..."

# Install dependencies (pnpm also runs the 'prepare' lifecycle hook, which installs husky)
echo "📦 Installing dependencies..."
pnpm install

# Create .env files from examples (if they exist)
if [ -f ".env.example" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env.development
fi

# Set git config
echo "⚙️  Configuring git..."
git config --global core.autocrlf input
git config --global init.defaultBranch main
# Mark the mounted workspace as safe for the non-root user (root set this in the
# Dockerfile but git config is per-user, so it must be repeated here for 'node').
git config --global --add safe.directory /workspace

echo "✅ Post-create setup complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Review .env.development and update with your configuration"
echo "  2. Run 'pnpm dev' to start development servers"
echo "  3. Check SETUP.md for detailed instructions"
