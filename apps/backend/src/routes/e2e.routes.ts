import fs from 'node:fs';
import path from 'node:path';

import { Router, type Request, type Response } from 'express';
import { container } from 'tsyringe';
import { z } from 'zod';

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

type E2EPersonaRole = 'USER' | 'ADMIN';

interface E2ESeedPersona {
  key: string;
  email: string;
  name: string;
  role: E2EPersonaRole;
  password: string;
}

export const e2eSeedPersonaSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9][a-z0-9_-]*$/i, { message: 'key must be alphanumeric/underscore/dash' })
      .optional(),
    // Avoid deprecated z.string().email() signature warnings in newer Zod typings.
    email: z
      .string()
      .trim()
      .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: 'Invalid email address',
      }),
    name: z.string().trim().min(1).max(128),
    role: z.enum(['USER', 'ADMIN']),
    password: z.string().min(8).max(128),
  })
  .strict();

const e2eSeedBodySchema = z
  .object({
    personas: z.array(e2eSeedPersonaSchema).max(50).optional(),
  })
  .strict();

export function buildDefaultPersonas(): E2ESeedPersona[] {
  return [
    {
      key: 'user',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      password: 'Password123!',
    },
    {
      key: 'admin',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      password: 'Admin123!',
    },
  ];
}

export function resolvePersonasFile(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

export function loadPersonasFromJsonFile(filePath: string): E2ESeedPersona[] {
  const resolved = resolvePersonasFile(filePath);
  let text: string;
  try {
    text = fs.readFileSync(resolved, 'utf8');
  } catch (err) {
    throw new Error(
      `E2E_PERSONAS_FILE not found or unreadable at ${resolved}: ${(err as Error).message}`
    );
  }
  const json = JSON.parse(text) as unknown;

  const raw = Array.isArray(json) ? json : (json as { personas?: unknown })?.personas;
  const parsed = z.array(e2eSeedPersonaSchema).safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid personas JSON in ${resolved}: ${JSON.stringify(parsed.error.issues)}`);
  }

  // Normalize to include keys (if missing) to keep behavior consistent with API payload handling.
  return parsed.data.map((p) => ({
    key: p.key ?? (p.email.includes('@') ? p.email.split('@')[0] || p.email : p.email),
    email: p.email,
    name: p.name,
    role: p.role,
    password: p.password,
  }));
}

export function normalizeSeedPersonas(
  raw: Array<z.infer<typeof e2eSeedPersonaSchema>> | undefined
): E2ESeedPersona[] {
  if (!raw || raw.length === 0) {
    const file = process.env['E2E_PERSONAS_FILE'];
    if (file) {
      // If a JSON file is configured, prefer it over built-in defaults.
      return loadPersonasFromJsonFile(file);
    }

    return buildDefaultPersonas();
  }

  const personas: E2ESeedPersona[] = raw.map((p) => {
    const key = p.key ?? (p.email.includes('@') ? p.email.split('@')[0] || p.email : p.email);

    return {
      key,
      email: p.email,
      name: p.name,
      role: p.role,
      password: p.password,
    };
  });

  // Deduplicate by key/email (first wins) to reduce footguns.
  const seenKey = new Set<string>();
  const seenEmail = new Set<string>();
  const out: E2ESeedPersona[] = [];
  for (const persona of personas) {
    if (seenKey.has(persona.key)) continue;
    if (seenEmail.has(persona.email)) continue;
    seenKey.add(persona.key);
    seenEmail.add(persona.email);
    out.push(persona);
  }

  return out.length ? out : buildDefaultPersonas();
}

router.post('/seed', async (req: Request, res: Response): Promise<void> => {
  if (isProduction()) {
    // Hide the endpoint in production.
    res.status(404).json({ error: 'Not Found' });
    return;
  }

  // When Playwright reuses an already-running backend (e.g. via Docker),
  // it cannot inject env vars into that server process. We optionally allow
  // the environment to provide `E2E_SEED_TOKEN`; if it is not set, we fall
  // back to a known local token so tests that reuse a running backend can
  // still perform seeding during development.
  const rawExpectedToken = process.env['E2E_SEED_TOKEN'];
  const expectedToken = rawExpectedToken || 'local-e2e-seed-token';

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

  const parsed = e2eSeedBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid seed payload',
      details: parsed.error.issues,
    });
    return;
  }

  const personas = normalizeSeedPersonas(parsed.data.personas);

  const seeded: Array<{ key: string; email: string }> = [];

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

    seeded.push({ key: persona.key, email: persona.email });
  }

  res.status(200).json({ ok: true, seeded });
});

export default router;
