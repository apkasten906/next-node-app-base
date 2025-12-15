/**
 * Global Setup for Playwright Tests
 * Runs once before all tests
 */
async function globalSetup(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🚀 Starting E2E test setup...');

  // Set environment variables for tests
  process.env['E2E_BASE_URL'] = process.env['E2E_BASE_URL'] || 'http://localhost:3000';
  process.env['API_BASE_URL'] = process.env['API_BASE_URL'] || 'http://localhost:4000';

  // Wait for services to be ready
  await waitForServices();

  // eslint-disable-next-line no-console
  console.log('✅ E2E test setup complete');
}

/**
 * Wait for services to be ready
 */
async function waitForServices(): Promise<void> {
  const baseURL = process.env['E2E_BASE_URL'] || 'http://localhost:3000';
  const maxAttempts = 30;
  const delay = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        // eslint-disable-next-line no-console
        console.log(`✅ Frontend service ready at ${baseURL}`);
        return;
      }
    } catch {
      // eslint-disable-next-line no-console
      console.log(`⏳ Waiting for services... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Services did not become ready in time');
}

export default globalSetup;
