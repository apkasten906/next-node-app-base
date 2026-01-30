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

Given('workflow lint tooling is present', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());

  const lintRunnerPath = path.resolve(repoRoot, 'scripts', 'lint-workflows.js');
  const actionlintPs1Path = path.resolve(repoRoot, 'scripts', 'actionlint.ps1');
  const actionlintShPath = path.resolve(repoRoot, 'scripts', 'actionlint.sh');
  const workflowLintPath = path.resolve(repoRoot, '.github', 'workflows', 'workflow-lint.yml');

  const [lintRunner, actionlintPs1, actionlintSh, workflowLint] = await Promise.all([
    readText(lintRunnerPath),
    readText(actionlintPs1Path),
    readText(actionlintShPath),
    readText(workflowLintPath),
  ]);

  // Keep a few basic invariants so `pnpm lint:workflows` remains cross-platform.
  expect(lintRunner).toContain('ACTIONLINT_VERSION');
  expect(lintRunner).toContain('WORKFLOWS_PATH');
  expect(lintRunner).toContain('actionlint.ps1');
  expect(lintRunner).toContain('actionlint.sh');

  this.setData('workflowLintRunner', lintRunner);
  this.setData('workflowActionlintPs1', actionlintPs1);
  this.setData('workflowActionlintSh', actionlintSh);
  this.setData('workflowLintWorkflow', workflowLint);
});

Then('root package.json should expose a workflows lint command', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const packageJsonPath = path.resolve(repoRoot, 'package.json');

  const packageJsonText = await readText(packageJsonPath);
  const pkg = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };

  expect(pkg.scripts).toBeDefined();
  expect(pkg.scripts?.['lint:workflows']).toBeDefined();
  expect(pkg.scripts?.['lint:workflows']).toContain('scripts/lint-workflows.js');
});

Then('a workflow-lint GitHub Actions workflow should exist', async function (this: World) {
  const workflow = this.getData<string>('workflowLintWorkflow');
  expect(workflow).toContain('name: Workflow Lint');
  expect(workflow).toContain('jobs:');
});

Then('the workflow-lint workflow should run actionlint', async function (this: World) {
  const workflow = this.getData<string>('workflowLintWorkflow');

  expect(workflow).toContain('actionlint:');
  expect(workflow).toContain('Workflow Lint (actionlint)');

  // Ensure the workflow actually invokes actionlint.
  expect(workflow).toContain('run: actionlint');
});
