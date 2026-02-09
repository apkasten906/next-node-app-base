export type E2EPersonaRole = 'USER' | 'ADMIN';

export interface E2ESeedPersona {
  key: string;
  email: string;
  name: string;
  role: E2EPersonaRole;
  password: string;
}

import fs from 'node:fs';
import path from 'node:path';

// Single source of truth for E2E personas.
//
// Default behavior: use the in-repo defaults below.
// Fork-friendly behavior: set `E2E_PERSONAS_FILE` to point at a JSON file
// with the shape from `personas.example.json`.

const defaultPersonas: Record<string, E2ESeedPersona> = {
  user: {
    key: 'user',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    password: 'Password123!',
  },
  admin: {
    key: 'admin',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
    password: 'Admin123!',
  },
};

function isRole(val: unknown): val is E2EPersonaRole {
  return val === 'USER' || val === 'ADMIN';
}

function asNonEmptyString(val: unknown, field: string): string {
  if (typeof val !== 'string') throw new TypeError(`Expected string for ${field}`);
  const trimmed = val.trim();
  if (!trimmed) throw new TypeError(`Expected non-empty string for ${field}`);
  return trimmed;
}

function resolvePersonasFile(filePath: string): string {
  // Relative paths are resolved from the process cwd (typically apps/frontend when running Playwright).
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function parsePersonasJson(raw: unknown): E2ESeedPersona[] {
  const maybeArray = Array.isArray(raw) ? raw : (raw as { personas?: unknown })?.personas;
  if (!Array.isArray(maybeArray)) {
    throw new TypeError('Invalid personas JSON: expected an array or { personas: [] }');
  }

  return maybeArray.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new TypeError(`Invalid persona at index ${idx}: expected object`);
    }

    const obj = item as Record<string, unknown>;
    const key = asNonEmptyString(obj['key'], `personas[${idx}].key`);
    const email = asNonEmptyString(obj['email'], `personas[${idx}].email`);
    // Basic email format validation (keeps parity with backend validator)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new TypeError(`Invalid personas[${idx}].email: not a valid email address`);
    }
    const name = asNonEmptyString(obj['name'], `personas[${idx}].name`);
    const password = asNonEmptyString(obj['password'], `personas[${idx}].password`);
    if (password.length < 8) {
      throw new TypeError(`personas[${idx}].password must be at least 8 characters`);
    }
    const roleRaw = obj['role'];
    if (!isRole(roleRaw)) {
      throw new TypeError(`Invalid personas[${idx}].role: expected USER or ADMIN`);
    }

    return { key, email, name, role: roleRaw, password };
  });
}

function personasArrayToRecord(personas: E2ESeedPersona[]): Record<string, E2ESeedPersona> {
  const record: Record<string, E2ESeedPersona> = {};
  for (const p of personas) {
    if (record[p.key]) throw new Error(`Duplicate persona key: ${p.key}`);
    record[p.key] = p;
  }
  return record;
}

function loadPersonasFromEnvOrDefaults(): Record<string, E2ESeedPersona> {
  const file = process.env['E2E_PERSONAS_FILE'];
  if (!file) return defaultPersonas;

  const resolved = resolvePersonasFile(file);

  let text: string;
  try {
    // Intentional: E2E_PERSONAS_FILE is a controlled environment variable for test fixtures.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    text = fs.readFileSync(resolved, 'utf8');
  } catch (err) {
    throw new Error(
      `E2E_PERSONAS_FILE not found or unreadable at ${resolved}: ${(err as Error).message}. Copy ${resolvePersonasFile('apps/frontend/e2e/fixtures/personas.example.json')} to this path to start.`
    );
  }
  const json = JSON.parse(text) as unknown;
  const personas = parsePersonasJson(json);
  return personasArrayToRecord(personas);
}

export const e2ePersonas: Record<string, E2ESeedPersona> = loadPersonasFromEnvOrDefaults();

export function getPersona(key: string): E2ESeedPersona {
  const persona = Object.values(e2ePersonas).find((p) => p.key === key);
  if (!persona) throw new Error(`Unknown E2E persona: ${String(key)}`);
  return persona;
}

export interface E2ESeedRequestBody {
  personas?: E2ESeedPersona[];
}

function uniqBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function getDefaultSeedPayload(): E2ESeedRequestBody {
  const personas = Object.values(e2ePersonas);

  // Guardrails: ensure stable ordering + no accidental duplicates.
  const stable = [...personas].sort((a, b) => a.key.localeCompare(b.key));
  return {
    personas: uniqBy(
      uniqBy(stable, (p) => p.key),
      (p) => p.email
    ),
  };
}
