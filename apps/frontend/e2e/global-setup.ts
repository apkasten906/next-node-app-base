/**
 * Global Setup for Playwright Tests
 * Runs once before all tests
 */
async function globalSetup(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🚀 Starting E2E test setup...');

  const frontendBaseUrl = process.env['E2E_BASE_URL'] || 'http://localhost:3000';
  const backendBaseUrl =
    process.env['E2E_BACKEND_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';
  const seedToken = process.env['E2E_SEED_TOKEN'] || 'local-e2e-seed-token';

  process.env['E2E_BASE_URL'] = frontendBaseUrl;
  process.env['E2E_BACKEND_URL'] = backendBaseUrl;
  process.env['E2E_SEED_TOKEN'] = seedToken;

  await waitForOk(`${backendBaseUrl}/health`, 'Backend');
  await waitForOk(frontendBaseUrl, 'Frontend');

  await seedE2E(`${backendBaseUrl}/api/e2e/seed`, seedToken);

  // eslint-disable-next-line no-console
  console.log('✅ E2E test setup complete');
}

/**
 * Wait for a service to be ready
 */
async function waitForOk(url: string, name: string): Promise<void> {
  const maxAttempts = 30;
  const delay = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        // eslint-disable-next-line no-console
        console.log(`✅ ${name} service ready at ${url}`);
        return;
      }
    } catch {
      // eslint-disable-next-line no-console
      console.log(`⏳ Waiting for ${name}... (${i + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${name} did not become ready in time: ${url}`);
}

async function seedE2E(seedUrl: string, seedToken: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`🌱 Seeding E2E fixtures via ${seedUrl}`);

  const res = await fetch(seedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-e2e-seed-token': seedToken,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`E2E seed failed (${res.status}): ${text || res.statusText}`);
  }

  const payload = (await res.json().catch(() => null)) as {
    ok?: boolean;
    seeded?: string[];
    skipped?: boolean;
    reason?: string;
  } | null;

  if (payload?.skipped) {
    // eslint-disable-next-line no-console
    console.log(`⚠️  E2E seed skipped: ${payload.reason ?? 'unknown reason'}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`✅ E2E seed complete${payload?.seeded ? ` (${payload.seeded.length} users)` : ''}`);
}

export default globalSetup;
