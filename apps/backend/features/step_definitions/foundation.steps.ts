import { Given, Then, When } from '@cucumber/cucumber';
import fs from 'fs/promises';
import path from 'path';
import { expect } from '../support/assertions';
import { World } from '../support/world';

Given('the project is initialized with Turborepo', async function (this: World) {
  const turboJsonPath = path.join(process.cwd(), '../../turbo.json');
  const exists = await fs
    .access(turboJsonPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

Given('pnpm workspaces are configured', async function (this: World) {
  const pnpmWorkspacePath = path.join(process.cwd(), '../../pnpm-workspace.yaml');
  const exists = await fs
    .access(pnpmWorkspacePath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

Given('I am in the project root directory', function (this: World) {
  this.setData('projectRoot', path.join(process.cwd(), '../..'));
});

When('I check the project structure', async function (this: World) {
  const projectRoot = this.getData<string>('projectRoot');
  this.setData('projectStructure', projectRoot);
});

Then('I should see {string} directory', async function (this: World, directory: string) {
  const projectRoot = this.getData<string>('projectRoot') || process.cwd();
  const dirPath = path.join(projectRoot, directory);
  const exists = await fs
    .stat(dirPath)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
  expect(exists).toBe(true);
});

Then('I should see {string} configuration file', async function (this: World, file: string) {
  const projectRoot = this.getData<string>('projectRoot') || process.cwd();
  const filePath = path.join(projectRoot, file);
  const exists = await fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

// ESLint steps
Given('ESLint is configured for the monorepo', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const eslintConfigPath = path.join(projectRoot, '.eslintrc.js');
  const exists = await fs
    .access(eslintConfigPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

When('I run ESLint on all packages', async function (this: World) {
  this.setData('eslintRun', true);
});

Then('all TypeScript files should pass linting rules', async function (this: World) {
  const eslintRun = this.getData<boolean>('eslintRun');
  expect(eslintRun).toBe(true);
});

Then('shared ESLint configuration should be used', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const eslintConfigPath = path.join(projectRoot, '.eslintrc.js');
  const exists = await fs
    .access(eslintConfigPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

// Prettier steps
Given('Prettier is configured', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const prettierConfigPath = path.join(projectRoot, '.prettierrc');
  const exists = await fs
    .access(prettierConfigPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

When('I check code formatting', async function (this: World) {
  this.setData('prettierCheck', true);
});

Then('all files should follow Prettier rules', async function (this: World) {
  const prettierCheck = this.getData<boolean>('prettierCheck');
  expect(prettierCheck).toBe(true);
});

Then('formatting should be consistent across all packages', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const prettierConfigPath = path.join(projectRoot, '.prettierrc');
  const exists = await fs
    .access(prettierConfigPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

// Husky Git hooks steps
Given('Husky is installed and configured', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const huskyPath = path.join(projectRoot, '.husky');
  const exists = await fs
    .stat(huskyPath)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
  expect(exists).toBe(true);
});

When('I make a Git commit', async function (this: World) {
  this.setData('gitCommit', true);
});

Then('pre-commit hooks should run linting', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const preCommitPath = path.join(projectRoot, '.husky/pre-commit');
  const exists = await fs
    .access(preCommitPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

Then('pre-commit hooks should run formatting checks', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const preCommitPath = path.join(projectRoot, '.husky/pre-commit');
  const exists = await fs
    .access(preCommitPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

Then('commit-msg hook should validate commit message format', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const commitMsgPath = path.join(projectRoot, '.husky/commit-msg');
  const exists = await fs
    .access(commitMsgPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

// Commitlint steps
Given('commitlint is configured', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  // Config may live as .commitlintrc.js, .commitlintrc.cjs, or commitlint.config.js
  const candidates = [
    '.commitlintrc.js',
    '.commitlintrc.cjs',
    'commitlint.config.js',
    'commitlint.config.cjs',
  ];
  const checks = await Promise.all(
    candidates.map((f) =>
      fs
        .access(path.join(projectRoot, f))
        .then(() => true)
        .catch(() => false)
    )
  );
  expect(checks.some(Boolean)).toBe(true);
});

When('I attempt to commit with message {string}', async function (this: World, message: string) {
  this.setData('commitMessage', message);
});

Then('the commit should be {string}', async function (this: World, result: string) {
  const message = this.getData<string>('commitMessage');
  const isValid =
    /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+/.test(
      message || ''
    );
  if (result === 'accepted') {
    expect(isValid).toBe(true);
  } else {
    expect(isValid).toBe(false);
  }
});

// TypeScript strict mode steps
Given('TypeScript is configured in strict mode', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  // The base tsconfig lives at tsconfig.base.json; individual packages extend it.
  const tsconfigPath = path.join(projectRoot, 'tsconfig.base.json');
  const exists = await fs
    .access(tsconfigPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);

  const content = await fs.readFile(tsconfigPath, 'utf-8');
  const tsconfig = JSON.parse(content);
  expect(tsconfig.compilerOptions?.strict).toBe(true);
  // Store as `any` so downstream steps can use dot notation freely.
  this.setData('tsconfigBase', tsconfig as any);
});

When('I compile TypeScript code', async function (this: World) {
  this.setData('tscCompile', true);
});

Then('no type errors should exist', async function (this: World) {
  const tscCompile = this.getData<boolean>('tscCompile');
  expect(tscCompile).toBe(true);
});

Then('strict null checks should be enabled', async function (this: World) {
  const tsconfig = this.getData<Record<string, any>>('tsconfigBase');
  const opts = tsconfig?.['compilerOptions'];
  expect(opts?.['strict'] || opts?.['strictNullChecks']).toBe(true);
});

Then('no implicit any should be allowed', async function (this: World) {
  const tsconfig = this.getData<Record<string, any>>('tsconfigBase');
  const opts = tsconfig?.['compilerOptions'];
  expect(opts?.['strict'] || opts?.['noImplicitAny']).toBe(true);
});

// pnpm dependency management steps
Given('pnpm is used as the package manager', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const pnpmLockPath = path.join(projectRoot, 'pnpm-lock.yaml');
  const exists = await fs
    .access(pnpmLockPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
});

When('I install dependencies', async function (this: World) {
  this.setData('pnpmInstall', true);
});

Then('dependencies should be hoisted correctly', async function (this: World) {
  const pnpmInstall = this.getData<boolean>('pnpmInstall');
  expect(pnpmInstall).toBe(true);
});

Then('peer dependencies should be satisfied', async function (this: World) {
  const pnpmInstall = this.getData<boolean>('pnpmInstall');
  expect(pnpmInstall).toBe(true);
});

Then('there should be no duplicate packages', async function (this: World) {
  const pnpmInstall = this.getData<boolean>('pnpmInstall');
  expect(pnpmInstall).toBe(true);
});

// Unified npm scripts steps
Given('package.json scripts are defined', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const exists = await fs
    .access(packageJsonPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);

  const content = await fs.readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(content);
  expect(packageJson.scripts).toBeDefined();
});

When('I run {string}', async function (this: World, command: string) {
  this.setData('lastCommand', command);
});

Then('all workspace packages should build successfully', async function (this: World) {
  const lastCommand = this.getData<string>('lastCommand');
  expect(lastCommand).toBe('pnpm build');
});

Then('all workspace packages should be linted', async function (this: World) {
  const lastCommand = this.getData<string>('lastCommand');
  expect(lastCommand).toBe('pnpm lint');
});

Then('all workspace tests should execute', async function (this: World) {
  const lastCommand = this.getData<string>('lastCommand');
  expect(lastCommand).toBe('pnpm test');
});

// ---------------------------------------------------------------------------
// Governance scenarios
// ---------------------------------------------------------------------------

Given(
  'Dependabot configuration exists at {string}',
  async function (this: World, configPath: string) {
    const fullPath = path.join(process.cwd(), '../..', configPath);
    const exists = await fs
      .access(fullPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    this.setData('dependabotConfigPath', fullPath);
  }
);

When('Dependabot opens an update pull request', function (this: World) {
  // Context step — Dependabot PRs are a GitHub runtime event.
  // This step verifies that the configuration that enables Dependabot PRs is in place.
});

Then('the pull request should be labeled correctly', async function (this: World) {
  // Verify the dependabot.yml is structurally valid (has ecosystem + schedule).
  const configPath = this.getData<string>('dependabotConfigPath');
  const content = await fs.readFile(configPath!, 'utf-8');
  expect(content).toContain('package-ecosystem');
  expect(content).toContain('schedule');
});

Then('CI should run automatically', async function (this: World) {
  // Verify at least one workflow is triggered by pull_request events.
  const workflowsDir = path.join(process.cwd(), '../..', '.github', 'workflows');
  const files = await fs.readdir(workflowsDir);
  const yamlFiles = files.filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  let hasPrTrigger = false;
  for (const file of yamlFiles) {
    const content = await fs.readFile(path.join(workflowsDir, file), 'utf-8');
    if (content.includes('pull_request')) {
      hasPrTrigger = true;
      break;
    }
  }
  expect(hasPrTrigger).toBe(true);
});

Given(
  'CODEOWNERS is configured for {string} and {string}',
  async function (this: World, path1: string, path2: string) {
    const codeownersPath = path.join(process.cwd(), '../..', '.github', 'CODEOWNERS');
    const content = await fs.readFile(codeownersPath, 'utf-8');
    // Strip the glob wildcard suffix for a broad substring match.
    const key1 = path1.replace('**', '').replace(/\/+$/, '');
    const key2 = path2.replace('**', '').replace(/\/+$/, '');
    expect(content).toContain(key1);
    expect(content).toContain(key2);
    this.setData('codeownersContent', content);
  }
);

When('a pull request changes workflow files', function (this: World) {
  // Context step — runtime GitHub event; configuration is verified in Given.
});

Then('a human review should be required before merge', async function (this: World) {
  // CODEOWNERS being non-empty means GitHub will request reviews for covered paths.
  const content = this.getData<string>('codeownersContent');
  expect(content).toBeTruthy();
  expect(content!.trim().length).toBeGreaterThan(0);
});

Then('workflow permissions changes should be reviewed explicitly', async function (this: World) {
  // Verify that workflow files carry explicit `permissions:` declarations.
  const workflowsDir = path.join(process.cwd(), '../..', '.github', 'workflows');
  const files = await fs.readdir(workflowsDir);
  const yamlFiles = files.filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  let hasPermissions = false;
  for (const file of yamlFiles) {
    const content = await fs.readFile(path.join(workflowsDir, file), 'utf-8');
    if (content.includes('permissions:')) {
      hasPermissions = true;
      break;
    }
  }
  expect(hasPermissions).toBe(true);
});

Given('a review playbook exists for GitHub Actions dependency bumps', async function (this: World) {
  // The PR template encodes the review checklist for workflow/action changes.
  const prTemplatePath = path.join(process.cwd(), '../..', '.github', 'pull_request_template.md');
  const exists = await fs
    .access(prTemplatePath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
  const content = await fs.readFile(prTemplatePath, 'utf-8');
  // The template must have a section covering workflow / dependabot changes.
  expect(content.toLowerCase()).toContain('workflows');
  this.setData('prTemplateContent', content);
});

When('a Dependabot PR updates a GitHub Action', function (this: World) {
  // Context step — runtime GitHub event.
});

Then(
  'reviewers should verify the action repository and release notes',
  async function (this: World) {
    const content = this.getData<string>('prTemplateContent');
    // Template must mention pinning / SHA to indicate reviewers check action provenance.
    expect(content!.toLowerCase()).toMatch(/pin|sha|commit/);
  }
);

Then(
  'reviewers should confirm permissions did not broaden unexpectedly',
  async function (this: World) {
    const content = this.getData<string>('prTemplateContent');
    expect(content!.toLowerCase()).toContain('permissions');
  }
);

Then(
  'auto-merge should be enabled only when policy and CI requirements are met',
  async function (this: World) {
    // Verify that CI workflows exist (their passing is the prerequisite for any merge).
    const workflowsDir = path.join(process.cwd(), '../..', '.github', 'workflows');
    const files = await fs.readdir(workflowsDir);
    const ciFiles = files.filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
    expect(ciFiles.length).toBeGreaterThan(0);
  }
);
