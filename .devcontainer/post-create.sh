#!/bin/bash

set -e

echo "🚀 Running post-create setup..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Set up git hooks
echo "🪝 Setting up Git hooks..."
pnpm prepare

# Create .env files from examples (if they exist)
if [ -f ".env.example" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env.development
fi

# Set git config
echo "⚙️  Configuring git..."
git config --global core.autocrlf input
git config --global init.defaultBranch main

echo "✅ Post-create setup complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Review .env.development and update with your configuration"
echo "  2. Run 'pnpm dev' to start development servers"
echo "  3. Check SETUP.md for detailed instructions"
