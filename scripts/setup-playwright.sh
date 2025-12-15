#!/bin/bash
#
# Setup Playwright browsers for E2E testing
#
# This script installs Playwright browsers required for E2E tests.
# Run this once after cloning the repository or when Playwright is updated.
#
# Usage: ./scripts/setup-playwright.sh

set -e

echo -e "\033[0;36mSetting up Playwright browsers...\033[0m"

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo -e "\033[0;31mError: pnpm is not installed or not in PATH\033[0m"
    echo -e "\033[0;33mPlease install pnpm: npm install -g pnpm\033[0m"
    exit 1
fi

# Install Playwright browsers
echo -e "\n\033[0;33mInstalling Playwright browsers (Chromium, Firefox, WebKit)...\033[0m"
pnpm --filter=frontend exec playwright install

echo -e "\n\033[0;32m✓ Playwright browsers installed successfully!\033[0m"
echo -e "\n\033[0;36mYou can now:\033[0m"
echo -e "  - Run E2E tests: \033[0mpnpm test:e2e"
echo -e "  - Open test UI: \033[0mpnpm test:e2e:ui"
echo -e "  - Debug tests: \033[0mpnpm test:e2e:debug"
echo -e "\n\033[0;36mIn VSCode Test Explorer:\033[0m"
echo -e "  1. Install 'Playwright Test' extension (ms-playwright.playwright)"
echo -e "  2. Reload window (Ctrl+Shift+P → 'Reload Window')"
echo -e "  3. Open Test Explorer to see all 435 Playwright tests"
