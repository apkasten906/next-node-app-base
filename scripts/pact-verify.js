#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const configPath = path.join(repoRoot, 'contracts', 'pact', 'pact.config.json');
const pactsDir = path.join(repoRoot, 'contracts', 'pact', 'pacts');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const pactFiles = fs.readdirSync(pactsDir).filter((name) => name.endsWith('.json'));

if (!config.consumer || !config.provider || pactFiles.length === 0) {
  console.error('Pact scaffold is incomplete.');
  process.exit(1);
}

process.stdout.write(
  `Pact scaffold ready: ${config.consumer} -> ${config.provider} (${pactFiles.length} pact file(s))\n`
);
