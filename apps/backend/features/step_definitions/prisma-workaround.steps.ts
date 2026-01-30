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

Given('Prisma CLI configuration is maintained at the monorepo root', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());

  const prismaConfigTsPath = path.resolve(repoRoot, 'prisma.config.ts');
  const prismaConfig = await readText(prismaConfigTsPath);

  expect(prismaConfig).toContain('defineConfig');
  expect(prismaConfig).toContain('apps');
  expect(prismaConfig).toContain('backend');
  expect(prismaConfig).toContain('schema.prisma');
  expect(prismaConfig).toContain('process.env.DATABASE_URL');

  this.setData('prismaConfigTs', prismaConfig);
});

Given('the backend Prisma schema should not embed a datasource URL', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const schemaPath = path.resolve(repoRoot, 'apps', 'backend', 'prisma', 'schema.prisma');

  const schema = await readText(schemaPath);

  expect(schema).toContain('datasource db');

  // Prisma 7 workaround: schema.prisma should not contain `url = ...` in the datasource.
  // (Comments may mention "URL"; that's fine.)
  expect(schema).not.toMatch(/\burl\s*=\s*/i);

  this.setData('schemaPrisma', schema);
});

Given(
  'a manual SQL initialization script exists for Prisma migrations',
  async function (this: World) {
    const repoRoot = getRepoRoot(process.cwd());
    const initSqlPath = path.resolve(repoRoot, 'apps', 'backend', 'prisma', 'init.sql');

    const initSql = await readText(initSqlPath);
    expect(initSql).toContain('Prisma 7');
    expect(initSql).toMatch(/CREATE\s+TABLE/i);

    this.setData('initSql', initSql);
  }
);

Then(
  'Docker build should generate Prisma client using the root prisma config',
  async function (this: World) {
    const repoRoot = getRepoRoot(process.cwd());
    const dockerfilePath = path.resolve(repoRoot, 'apps', 'backend', 'Dockerfile');

    const dockerfile = await readText(dockerfilePath);

    // Ensure the container build uses the root prisma.config.ts for Prisma 7.
    expect(dockerfile).toContain('prisma generate --config /app/prisma.config.ts');
  }
);

Then(
  'Docker Compose should apply migrations using the root prisma config',
  async function (this: World) {
    const repoRoot = getRepoRoot(process.cwd());
    const composePath = path.resolve(repoRoot, 'docker-compose.yml');

    const compose = await readText(composePath);

    // Ensure the compose command uses prisma.config.ts (monorepo root) when applying migrations.
    expect(compose).toContain('prisma migrate deploy --config /app/prisma.config.ts');
  }
);

Then('ADR-010 should document the Prisma 7 migration workaround', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const adrPath = path.resolve(repoRoot, 'docs', 'adr', '010-prisma-7-cli-migration-workaround.md');

  const adr = await readText(adrPath);

  expect(adr).toContain('ADR 010');
  expect(adr).toContain('Prisma 7');
  expect(adr).toContain('prisma.config.ts');
  expect(adr).toMatch(/manual SQL|init\.sql/i);
});
