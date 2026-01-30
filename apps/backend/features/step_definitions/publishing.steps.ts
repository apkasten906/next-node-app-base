import { Given, Then } from '@cucumber/cucumber';

import fs from 'node:fs/promises';
import path from 'node:path';

import { expect } from '../support/assertions';
import { World } from '../support/world';

function getRepoRoot(cwd: string): string {
  // Backend Cucumber runs with cwd = apps/backend
  return path.resolve(cwd, '..', '..');
}

async function readText(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8');
  expect(content.length).toBeGreaterThan(0);
  return content;
}

Given('advanced testing tools are configured', async function (this: World) {
  // Deterministic @ready: no external tooling required.
  this.setData('advancedTestingToolsConfigured', true);
});

Given('a registry-agnostic publish script exists', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const scriptPath = path.resolve(repoRoot, 'scripts', 'publish-packages.js');

  const script = await readText(scriptPath);
  this.setData('publishScript', script);
});

Given('an npmrc template exists for local publishing', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const npmrcTemplatePath = path.resolve(repoRoot, '.npmrc.template');

  const npmrc = await readText(npmrcTemplatePath);
  this.setData('npmrcTemplate', npmrc);
});

Given('a GitHub Actions publish workflow is configured', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const workflowPath = path.resolve(repoRoot, '.github', 'workflows', 'publish.yml');

  const workflow = await readText(workflowPath);
  this.setData('publishWorkflow', workflow);
});

Then(
  'the publish script should accept registry and token via environment variables',
  async function (this: World) {
    const script = this.getData<string>('publishScript');

    expect(script).toContain('process.env.REGISTRY_URL');
    expect(script).toContain('process.env.NPM_AUTH_TOKEN');
    expect(script).toContain('process.env.GITHUB_TOKEN');
    expect(script).toContain('process.env.DRY_RUN');

    // Ensure it actually passes the registry to pnpm publish.
    expect(script).toContain('--registry ${REGISTRY_URL}');

    // Ensure it fails fast if no token.
    expect(script).toContain('NPM_AUTH_TOKEN or GITHUB_TOKEN is required');
  }
);

Then(
  'the publish workflow should run the publish script with a token',
  async function (this: World) {
    const workflow = this.getData<string>('publishWorkflow');

    expect(workflow).toContain('name: Publish Packages');
    expect(workflow).toContain('workflow_dispatch');

    // The plan claims tag/release publishing. Enforce triggers exist.
    expect(workflow).toContain('push:');
    expect(workflow).toContain('tags:');
    expect(workflow).toMatch(/-\s*['"]v\*['"]/);
    expect(workflow).toContain('release:');
    expect(workflow).toContain('types: [published]');

    // Permissions must allow publishing packages and updating release notes.
    expect(workflow).toContain('packages: write');
    expect(workflow).toContain('contents: write');

    // It must call the script.
    expect(workflow).toContain('run: node scripts/publish-packages.js');

    // It must supply a token for publishing.
    expect(workflow).toContain('NPM_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}');

    // It must set a registry URL (defaulting to GitHub Packages).
    expect(workflow).toContain('url=https://npm.pkg.github.com');
  }
);
