import { Router, type Request, type Response } from 'express';
import { container } from 'tsyringe';

import { EncryptionService } from '../services/auth/encryption.service';
import { DatabaseService } from '../services/database.service';

const router: import('express').Router = Router();

function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

function getSeedToken(req: Request): string | undefined {
  const raw = req.headers['x-e2e-seed-token'];
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

router.post('/seed', async (req: Request, res: Response): Promise<void> => {
  if (isProduction()) {
    // Hide the endpoint in production.
    res.status(404).json({ error: 'Not Found' });
    return;
  }

  const expectedToken = process.env['E2E_SEED_TOKEN'];
  if (!expectedToken) {
    res.status(500).json({ error: 'E2E_SEED_TOKEN is not configured' });
    return;
  }

  const providedToken = getSeedToken(req);
  if (!providedToken || providedToken !== expectedToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const db = container.resolve(DatabaseService);

  // Allow this to be called even when DB is unavailable (some E2E runs use AUTH_ENABLE_DEV_FALLBACK).
  const dbReachable = await db.healthCheck().catch(() => false);
  if (!dbReachable) {
    res.status(200).json({ skipped: true, reason: 'database not reachable' });
    return;
  }

  // Ensure table exists (prevents noisy errors when DB exists but migrations are missing).
  const existsResult = await db.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name='users'
    ) AS exists
  `;
  const hasUsersTable = existsResult[0]?.exists === true;

  if (!hasUsersTable) {
    res.status(200).json({ skipped: true, reason: 'users table not found' });
    return;
  }

  const enc = container.resolve(EncryptionService);

  const personas: Array<{ email: string; name: string; role: 'USER' | 'ADMIN'; password: string }> =
    [
      { email: 'test@example.com', name: 'Test User', role: 'USER', password: 'Password123!' },
      { email: 'admin@example.com', name: 'Admin User', role: 'ADMIN', password: 'Admin123!' },
    ];

  const seededEmails: string[] = [];

  for (const persona of personas) {
    const passwordHash = await enc.hash(persona.password);

    await db.user.upsert({
      where: { email: persona.email },
      update: {
        name: persona.name,
        role: persona.role,
        passwordHash,
      },
      create: {
        email: persona.email,
        name: persona.name,
        role: persona.role,
        passwordHash,
      },
    });

    seededEmails.push(persona.email);
  }

  res.status(200).json({ ok: true, seeded: seededEmails });
});

export default router;
