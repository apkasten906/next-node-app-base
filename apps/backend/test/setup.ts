// Test setup: force mocks for external services to keep tests deterministic
import 'reflect-metadata'; // required by tsyringe

process.env.REDIS_MOCK = process.env.REDIS_MOCK || 'true';
process.env.TEST_EXTERNAL_SERVICES = process.env.TEST_EXTERNAL_SERVICES || 'false';

// Optional: reduce log noise during tests
if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'warn';
}

// If you need to set other test-time flags, add them here.
