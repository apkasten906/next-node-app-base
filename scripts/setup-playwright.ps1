#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup Playwright browsers for E2E testing

.DESCRIPTION
    This script installs Playwright browsers required for E2E tests.
    Run this once after cloning the repository or when Playwright is updated.

.EXAMPLE
    .\scripts\setup-playwright.ps1
#>

Write-Host "Setting up Playwright browsers..." -ForegroundColor Cyan

# Check if pnpm is available
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: pnpm is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install pnpm: npm install -g pnpm" -ForegroundColor Yellow
    exit 1
}

# Install Playwright browsers
Write-Host "`nInstalling Playwright browsers (Chromium, Firefox, WebKit)..." -ForegroundColor Yellow
pnpm --filter=frontend exec playwright install

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Playwright browsers installed successfully!" -ForegroundColor Green
    Write-Host "`nYou can now:" -ForegroundColor Cyan
    Write-Host "  - Run E2E tests: pnpm test:e2e" -ForegroundColor White
    Write-Host "  - Open test UI: pnpm test:e2e:ui" -ForegroundColor White
    Write-Host "  - Debug tests: pnpm test:e2e:debug" -ForegroundColor White
    Write-Host "`nIn VSCode Test Explorer:" -ForegroundColor Cyan
    Write-Host "  1. Install 'Playwright Test' extension (ms-playwright.playwright)" -ForegroundColor White
    Write-Host "  2. Reload window (Ctrl+Shift+P → 'Reload Window')" -ForegroundColor White
    Write-Host "  3. Open Test Explorer to see all 435 Playwright tests" -ForegroundColor White
} else {
    Write-Host "`n✗ Failed to install Playwright browsers" -ForegroundColor Red
    exit 1
}
