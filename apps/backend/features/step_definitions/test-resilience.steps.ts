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

Given('backend test setup forces external service mocks', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const setupPath = path.resolve(repoRoot, 'apps', 'backend', 'test', 'setup.ts');

  const setup = await readText(setupPath);

  expect(setup).toContain('process.env.REDIS_MOCK');
  expect(setup).toContain('process.env.TEST_EXTERNAL_SERVICES');

  // Default behavior: force deterministic, mock-friendly environment.
  expect(setup).toMatch(
    /process\.env\.REDIS_MOCK\s*=\s*process\.env\.REDIS_MOCK\s*\|\|\s*['"]true['"]/
  );
  expect(setup).toMatch(
    /process\.env\.TEST_EXTERNAL_SERVICES\s*=\s*process\.env\.TEST_EXTERNAL_SERVICES\s*\|\|\s*['"]false['"]/
  );
});

Given('backend CI test runner forces external service mocks', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const runnerPath = path.resolve(repoRoot, 'scripts', 'run-backend-tests-ci.js');

  const runner = await readText(runnerPath);

  expect(runner).toContain('TEST_EXTERNAL_SERVICES');
  expect(runner).toContain('REDIS_MOCK');

  // Must force the mocks in CI/quick gates.
  expect(runner).toMatch(/TEST_EXTERNAL_SERVICES\s*:\s*['"]false['"]/);
  expect(runner).toMatch(/REDIS_MOCK\s*:\s*['"]true['"]/);
});

Then(
  'CacheService should select MockRedis when external services are disabled',
  async function (this: World) {
    const repoRoot = getRepoRoot(process.cwd());
    const cacheServicePath = path.resolve(
      repoRoot,
      'apps',
      'backend',
      'src',
      'services',
      'cache.service.ts'
    );

    const cacheService = await readText(cacheServicePath);

    expect(cacheService).toContain('class MockRedis');
    expect(cacheService).toContain("process.env['TEST_EXTERNAL_SERVICES']");
    expect(cacheService).toContain("process.env['REDIS_MOCK']");
    expect(cacheService).toContain('this.client = new MockRedis()');
  }
);

Then(
  'Redis and database integration tests should be skippable when external services are disabled',
  async function (this: World) {
    const repoRoot = getRepoRoot(process.cwd());

    const redisTestPath = path.resolve(
      repoRoot,
      'apps',
      'backend',
      'src',
      'tests',
      'integration',
      'redis.test.ts'
    );
    const dbTestPath = path.resolve(
      repoRoot,
      'apps',
      'backend',
      'src',
      'tests',
      'integration',
      'database.test.ts'
    );

    const [redisTest, dbTest] = await Promise.all([readText(redisTestPath), readText(dbTestPath)]);

    expect(redisTest).toContain('describe.skipIf');
    expect(redisTest).toContain('TEST_EXTERNAL_SERVICES');
    expect(redisTest).toContain('REDIS_MOCK');

    expect(dbTest).toContain('describe.skipIf');
    expect(dbTest).toContain('TEST_EXTERNAL_SERVICES');
    // Many environments omit DATABASE_URL; ensure it is considered in the skip condition.
    expect(dbTest).toContain('DATABASE_URL');
  }
);
