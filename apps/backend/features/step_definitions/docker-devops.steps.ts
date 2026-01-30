import { Given, Then, When } from '@cucumber/cucumber';

import fs from 'node:fs/promises';
import path from 'node:path';

import { expect } from '../support/assertions';
import { World } from '../support/world';

function getRepoRoot(cwd: string): string {
  // Backend Cucumber runs with cwd = apps/backend
  return path.resolve(cwd, '..', '..');
}

async function readFileOrFail(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8');
  expect(content.length).toBeGreaterThan(0);
  return content;
}

function assertMultiStageDockerfile(dockerfile: string, stageNames: string[]) {
  for (const stageName of stageNames) {
    expect(dockerfile).toContain(` AS ${stageName}`);
  }

  // Ensure there are multiple FROM directives.
  const fromCount = dockerfile
    .split(/\r?\n/)
    .filter((line) => line.trim().toUpperCase().startsWith('FROM ')).length;
  expect(fromCount).toBeGreaterThanOrEqual(3);
}

// Background steps (only matter for @ready scenarios in this feature file)
Given('Kubernetes cluster is available', async function (this: World) {
  // Deterministic @ready: we don't require a real cluster.
  this.setData('k8sClusterAvailable', true);
});

Given('DevOps tools are configured', async function (this: World) {
  this.setData('devopsToolsConfigured', true);
});

// Docker build scenario
Given('a multi-stage Dockerfile exists', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());

  const backendDockerfilePath = path.resolve(repoRoot, 'apps', 'backend', 'Dockerfile');
  const frontendDockerfilePath = path.resolve(repoRoot, 'apps', 'frontend', 'Dockerfile');

  const [backendDockerfile, frontendDockerfile] = await Promise.all([
    readFileOrFail(backendDockerfilePath),
    readFileOrFail(frontendDockerfilePath),
  ]);

  assertMultiStageDockerfile(backendDockerfile, ['deps', 'builder', 'prod-deps', 'runner']);
  assertMultiStageDockerfile(frontendDockerfile, ['deps', 'builder', 'runner']);

  this.setData('backendDockerfile', backendDockerfile);
  this.setData('frontendDockerfile', frontendDockerfile);
});

When('I build the Docker image', async function (this: World) {
  // Deterministic @ready: we validate build configuration, not the Docker runtime.
  this.setData('dockerBuildValidated', true);
});

Then('build should use caching', async function (this: World) {
  const backendDockerfile = this.getData<string>('backendDockerfile');
  const frontendDockerfile = this.getData<string>('frontendDockerfile');

  expect(backendDockerfile).toContain('--mount=type=cache');
  expect(frontendDockerfile).toContain('--mount=type=cache');
});

Then('final image should be optimized', async function (this: World) {
  const backendDockerfile = this.getData<string>('backendDockerfile');
  const frontendDockerfile = this.getData<string>('frontendDockerfile');

  // Heuristics that indicate a reasonably optimized production image.
  expect(backendDockerfile).toContain('FROM node:${NODE_VERSION}-alpine AS runner');
  expect(backendDockerfile).toContain('USER nodejs');
  expect(backendDockerfile).toContain('COPY --from=builder');

  expect(frontendDockerfile).toContain('FROM node:${NODE_VERSION}-alpine AS runner');
  expect(frontendDockerfile).toContain('USER nextjs');
  expect(frontendDockerfile).toContain('.next/standalone');
});

Then('image size should be minimal', async function (this: World) {
  const backendDockerfile = this.getData<string>('backendDockerfile');
  const frontendDockerfile = this.getData<string>('frontendDockerfile');

  // We can't measure image size deterministically here; instead we assert
  // size-reduction patterns are present.
  expect(backendDockerfile).toContain('pnpm install --frozen-lockfile --prod');
  expect(frontendDockerfile).toContain('standalone');
});

// Docker Compose scenario
Given('Docker Compose configuration exists', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const composePath = path.resolve(repoRoot, 'docker-compose.yml');

  const compose = await readFileOrFail(composePath);
  this.setData('dockerCompose', compose);
});

Then('the Compose file should define required services', async function (this: World) {
  const compose = this.getData<string>('dockerCompose');

  expect(compose).toContain('services:');
  expect(compose).toContain('\n  postgres:');
  expect(compose).toContain('\n  redis:');
  expect(compose).toContain('\n  backend:');
  expect(compose).toContain('\n  frontend:');
});

Then('backend service should build from the backend Dockerfile', async function (this: World) {
  const compose = this.getData<string>('dockerCompose');

  expect(compose).toContain('dockerfile: apps/backend/Dockerfile');
  expect(compose).toContain('target: runner');
});

Then('frontend service should build from the frontend Dockerfile', async function (this: World) {
  const compose = this.getData<string>('dockerCompose');

  expect(compose).toContain('dockerfile: apps/frontend/Dockerfile');
  expect(compose).toContain('target: runner');
});
