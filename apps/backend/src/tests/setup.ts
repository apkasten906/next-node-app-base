import 'reflect-metadata';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { container } from 'tsyringe';

// Reset DI container before each test
beforeEach(() => {
  container.clearInstances();
});

// Clean up after tests
afterEach(() => {
  container.clearInstances();
});

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env['NODE_ENV'] = 'test';
});

// Global test teardown
afterAll(async () => {
  // Cleanup
});
