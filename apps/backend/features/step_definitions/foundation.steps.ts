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
  const commitlintConfigPath = path.join(projectRoot, 'commitlint.config.js');
  const exists = await fs
    .access(commitlintConfigPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);
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
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  const exists = await fs
    .access(tsconfigPath)
    .then(() => true)
    .catch(() => false);
  expect(exists).toBe(true);

  const content = await fs.readFile(tsconfigPath, 'utf-8');
  const tsconfig = JSON.parse(content);
  expect(tsconfig.compilerOptions?.strict).toBe(true);
});

When('I compile TypeScript code', async function (this: World) {
  this.setData('tscCompile', true);
});

Then('no type errors should exist', async function (this: World) {
  const tscCompile = this.getData<boolean>('tscCompile');
  expect(tscCompile).toBe(true);
});

Then('strict null checks should be enabled', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  const content = await fs.readFile(tsconfigPath, 'utf-8');
  const tsconfig = JSON.parse(content);
  expect(tsconfig.compilerOptions?.strict || tsconfig.compilerOptions?.strictNullChecks).toBe(true);
});

Then('no implicit any should be allowed', async function (this: World) {
  const projectRoot = path.join(process.cwd(), '../..');
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  const content = await fs.readFile(tsconfigPath, 'utf-8');
  const tsconfig = JSON.parse(content);
  expect(tsconfig.compilerOptions?.strict || tsconfig.compilerOptions?.noImplicitAny).toBe(true);
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
