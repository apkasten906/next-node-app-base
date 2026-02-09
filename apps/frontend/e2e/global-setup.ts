/**
 * Global Setup for Playwright Tests
 * Runs once before all tests
 */
import { getDefaultSeedPayload } from './fixtures/personas';

function writeLine(stream: NodeJS.WriteStream, line: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    stream.write(`${line}\n`, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function info(line: string): Promise<void> {
  return writeLine(process.stdout, line);
}

function warn(line: string): Promise<void> {
  return writeLine(process.stderr, line);
}

async function globalSetup(): Promise<void> {
  await info('🚀 Starting E2E test setup...');

  const frontendBaseUrl = process.env['E2E_BASE_URL'] || 'http://localhost:3000';
  const backendBaseUrl =
    process.env['E2E_BACKEND_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';
  const seedToken = process.env['E2E_SEED_TOKEN'] || 'local-e2e-seed-token';

  process.env['E2E_BASE_URL'] = frontendBaseUrl;
  process.env['E2E_BACKEND_URL'] = backendBaseUrl;
  process.env['E2E_SEED_TOKEN'] = seedToken;

  await waitForOk(`${backendBaseUrl}/health`, 'Backend');
  await waitForOk(frontendBaseUrl, 'Frontend');

  await seedE2E(`${backendBaseUrl}/api/e2e/seed`, seedToken, getDefaultSeedPayload());

  await info('✅ E2E test setup complete');
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
        await info(`✅ ${name} service ready at ${url}`);
        return;
      }
    } catch {
      await info(`⏳ Waiting for ${name}... (${i + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${name} did not become ready in time: ${url}`);
}

async function seedE2E(
  seedUrl: string,
  seedToken: string,
  seedRequestBody: unknown
): Promise<void> {
  await info(`🌱 Seeding E2E fixtures via ${seedUrl}`);

  const res = await fetch(seedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-e2e-seed-token': seedToken,
    },
    body: JSON.stringify(seedRequestBody),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`E2E seed failed (${res.status}): ${text || res.statusText}`);
  }

  const seedResponse = (await res.json().catch(() => null)) as {
    ok?: boolean;
    seeded?: unknown[];
    skipped?: boolean;
    reason?: string;
  } | null;

  if (seedResponse?.skipped) {
    await warn(`E2E seed skipped: ${seedResponse.reason ?? 'unknown reason'}`);
    return;
  }

  const seeded = seedResponse?.seeded;
  const seededCount = Array.isArray(seeded) ? seeded.length : 0;
  const suffix = seededCount ? ` (${seededCount} users)` : '';
  await info(`E2E seed complete${suffix}`);
}

export default globalSetup;
