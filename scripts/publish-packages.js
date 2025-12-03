#!/usr/bin/env node
/**
 * Registry-agnostic package publishing script
 *
 * This script publishes workspace packages to an npm-compatible registry.
 * It defaults to GitHub Packages but can be configured to use any registry
 * via environment variables, making it suitable for CI/CD and service mesh
 * scenarios where an internal registry is exposed.
 *
 * Environment Variables:
 * - REGISTRY_URL: Target npm registry (default: https://npm.pkg.github.com)
 * - NPM_AUTH_TOKEN: Authentication token for the registry (or GITHUB_TOKEN for GitHub Packages)
 * - DRY_RUN: Set to 'true' to run publish with --dry-run flag
 * - PACKAGES_FILTER: Comma-separated list of package names to publish (default: all non-private packages)
 * - PUBLISH_ACCESS: npm publish access level ('public' or 'restricted', default: 'restricted')
 *
 * Usage:
 *   node scripts/publish-packages.js
 *   DRY_RUN=true node scripts/publish-packages.js
 *   REGISTRY_URL=http://npm-registry.svc.cluster.local:4873 node scripts/publish-packages.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration from environment
const REGISTRY_URL = process.env.REGISTRY_URL || 'https://npm.pkg.github.com';
const NPM_AUTH_TOKEN = process.env.NPM_AUTH_TOKEN || process.env.GITHUB_TOKEN;
const DRY_RUN = process.env.DRY_RUN === 'true';
const PACKAGES_FILTER = process.env.PACKAGES_FILTER
  ? process.env.PACKAGES_FILTER.split(',').map((p) => p.trim())
  : null;
const PUBLISH_ACCESS = process.env.PUBLISH_ACCESS || 'restricted';

// Validate required environment
if (!NPM_AUTH_TOKEN) {
  console.error('❌ Error: NPM_AUTH_TOKEN or GITHUB_TOKEN is required');
  console.error(
    '   Set one of these environment variables with your registry authentication token.'
  );
  process.exit(1);
}

// Extract registry scope from URL for .npmrc configuration
function getRegistryScope(registryUrl) {
  // For GitHub Packages, scope is typically @owner
  if (registryUrl.includes('npm.pkg.github.com')) {
    // Extract from repository info or use owner from package.json
    const rootPackageJson = require(path.join(__dirname, '..', 'package.json'));
    if (rootPackageJson.repository && typeof rootPackageJson.repository === 'object') {
      const repo = rootPackageJson.repository.url || rootPackageJson.repository;
      const match = repo.match(/github\.com[:/]([^/]+)/);
      if (match) return `@${match[1]}`;
    }
  }
  return null;
}

// Setup .npmrc with registry authentication
function setupNpmrc() {
  const npmrcPath = path.join(__dirname, '..', '.npmrc');
  const scope = getRegistryScope(REGISTRY_URL);

  let npmrcContent = '';

  // Add scoped registry configuration
  if (scope) {
    npmrcContent += `${scope}:registry=${REGISTRY_URL}\n`;
  } else {
    npmrcContent += `registry=${REGISTRY_URL}\n`;
  }

  // Add authentication token
  // Strip protocol for the auth line
  const registryHost = REGISTRY_URL.replace(/^https?:\/\//, '');
  npmrcContent += `//${registryHost}/:_authToken=${NPM_AUTH_TOKEN}\n`;
  npmrcContent += `//npm.pkg.github.com/:_authToken=${NPM_AUTH_TOKEN}\n`; // Fallback for GitHub

  // Security settings
  npmrcContent += 'always-auth=true\n';

  fs.writeFileSync(npmrcPath, npmrcContent);
  console.log(`✅ Created .npmrc with registry: ${REGISTRY_URL}`);
}

// Get publishable packages from workspace
function getPublishablePackages() {
  const packagesDir = path.join(__dirname, '..', 'packages');
  const packages = [];

  if (!fs.existsSync(packagesDir)) {
    console.warn('⚠️  No packages directory found');
    return packages;
  }

  const packageDirs = fs.readdirSync(packagesDir);

  for (const dir of packageDirs) {
    const packageJsonPath = path.join(packagesDir, dir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) continue;

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Skip private packages
    if (packageJson.private) {
      console.log(`⏭️  Skipping private package: ${packageJson.name}`);
      continue;
    }

    // Apply filter if specified
    if (PACKAGES_FILTER && !PACKAGES_FILTER.includes(packageJson.name)) {
      console.log(`⏭️  Filtered out package: ${packageJson.name}`);
      continue;
    }

    packages.push({
      name: packageJson.name,
      version: packageJson.version,
      path: path.join(packagesDir, dir),
      packageJson: packageJsonPath,
    });
  }

  return packages;
}

// Publish a single package
function publishPackage(pkg) {
  const { name, version, path: pkgPath } = pkg;

  console.log(`\n📦 Publishing ${name}@${version} to ${REGISTRY_URL}`);

  try {
    const publishCmd = [
      'pnpm publish',
      `--registry ${REGISTRY_URL}`,
      `--access ${PUBLISH_ACCESS}`,
      '--no-git-checks', // We'll handle git checks separately
      DRY_RUN ? '--dry-run' : '',
    ]
      .filter(Boolean)
      .join(' ');

    console.log(`   Command: ${publishCmd}`);

    execSync(publishCmd, {
      cwd: pkgPath,
      stdio: 'inherit',
      env: {
        ...process.env,
        NPM_CONFIG_REGISTRY: REGISTRY_URL,
      },
    });

    if (DRY_RUN) {
      console.log(`✅ Dry-run successful for ${name}@${version}`);
    } else {
      console.log(`✅ Published ${name}@${version}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to publish ${name}@${version}`);
    console.error(error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('🚀 Package Publishing Script');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Registry URL: ${REGISTRY_URL}`);
  console.log(`Publish Access: ${PUBLISH_ACCESS}`);
  console.log(`Dry Run: ${DRY_RUN ? 'YES' : 'NO'}`);
  console.log(`Filter: ${PACKAGES_FILTER ? PACKAGES_FILTER.join(', ') : 'ALL'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Setup authentication
  setupNpmrc();

  // Get packages to publish
  const packages = getPublishablePackages();

  if (packages.length === 0) {
    console.log('\n⚠️  No publishable packages found');
    console.log('   Make sure packages have "private": false in package.json');
    return;
  }

  console.log(`\nFound ${packages.length} publishable package(s):`);
  packages.forEach((pkg) => console.log(`  - ${pkg.name}@${pkg.version}`));

  // Publish each package
  const results = packages.map(publishPackage);
  const successCount = results.filter(Boolean).length;
  const failCount = results.length - successCount;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`📊 Publishing Summary:`);
  console.log(`   Total: ${results.length}`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Clean up .npmrc (optional, comment out if you want to keep it)
  const npmrcPath = path.join(__dirname, '..', '.npmrc');
  if (fs.existsSync(npmrcPath)) {
    fs.unlinkSync(npmrcPath);
    console.log('🧹 Cleaned up .npmrc file');
  }

  // Exit with error if any packages failed
  if (failCount > 0) {
    process.exit(1);
  }
}

// Run main function
main();
