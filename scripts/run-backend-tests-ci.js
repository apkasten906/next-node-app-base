#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Ensure this script is run from repo root
const repoRoot = path.resolve(__dirname, '..');

// Command string to run via shell (more robust cross-platform)
const isQuick = process.argv.includes('--quick') || process.env['QUICK'] === 'true';
const cmdString = isQuick
  ? 'pnpm -C apps/backend run test:unit:fast'
  : 'pnpm -C apps/backend run test:ci';

// Prepare environment overrides
const env = Object.assign({}, process.env, {
  TEST_EXTERNAL_SERVICES: 'false',
  REDIS_MOCK: 'true',
});

console.log('Running backend CI tests with TEST_EXTERNAL_SERVICES=false and REDIS_MOCK=true');

const child = spawn(cmdString, {
  env,
  stdio: 'inherit',
  cwd: repoRoot,
  shell: true,
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Failed to start test runner:', err);
  process.exit(1);
});
