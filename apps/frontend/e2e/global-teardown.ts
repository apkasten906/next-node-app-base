/**
 * Global Teardown for Playwright Tests
 * Runs once after all tests
 */
async function globalTeardown(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🧹 Starting E2E test teardown...');

  // Clean up any test data or resources here
  // For example: clear test database, close connections, etc.

  // eslint-disable-next-line no-console
  console.log('✅ E2E test teardown complete');
}

export default globalTeardown;
