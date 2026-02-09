import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildDefaultPersonas,
  loadPersonasFromJsonFile,
  normalizeSeedPersonas,
} from '../src/routes/e2e.routes';

describe('backend E2E persona helpers', () => {
  it('buildDefaultPersonas returns user and admin by default', () => {
    const defs = buildDefaultPersonas();
    expect(Array.isArray(defs)).toBe(true);
    expect(defs.find((d) => d.key === 'user')).toBeTruthy();
    expect(defs.find((d) => d.key === 'admin')).toBeTruthy();
  });

  it('normalizeSeedPersonas returns defaults when input is empty', () => {
    const normalized = normalizeSeedPersonas(undefined);
    expect(Array.isArray(normalized)).toBe(true);
    expect(normalized.length).toBeGreaterThanOrEqual(2);
  });

  it('normalizeSeedPersonas deduplicates by key and email and generates key when missing', () => {
    type RawPersona = {
      key?: string;
      email: string;
      name: string;
      role: 'USER' | 'ADMIN';
      password: string;
    }[];
    const raw: RawPersona = [
      { email: 'dup@example.com', name: 'A', role: 'USER', password: 'Password1!' },
      { key: 'dup', email: 'dup@example.com', name: 'B', role: 'USER', password: 'Password2!' },
      { email: 'unique@example.com', name: 'C', role: 'ADMIN', password: 'AdminPass1!' },
    ];

    const normalized = normalizeSeedPersonas(raw);
    // Expect dedupe: only one entry for dup@example.com
    const dup = normalized.filter((p) => p.email === 'dup@example.com');
    expect(dup.length).toBe(1);
    const generatedKey = normalized.find((p) => p.email === 'unique@example.com')?.key;
    expect(typeof generatedKey).toBe('string');
    expect(generatedKey).toContain('unique');
  });

  it('loadPersonasFromJsonFile reads and parses a JSON file with personas', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-personas-'));
    const filePath = path.join(tmpDir, 'personas.json');
    const payload = {
      personas: [
        { email: 'fileuser@example.com', name: 'File User', role: 'USER', password: 'FilePass1!' },
      ],
    };
    const resolvedFilePath = path.resolve(filePath);
    const resolvedTmpDir = path.resolve(tmpDir);
    // Ensure the target file is inside the temporary directory to avoid path traversal
    if (
      !resolvedFilePath.startsWith(resolvedTmpDir + path.sep) &&
      resolvedFilePath !== resolvedTmpDir
    ) {
      throw new Error('Unsafe tmp file path detected');
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(resolvedFilePath, JSON.stringify(payload), 'utf8');

    const loaded = loadPersonasFromJsonFile(filePath);
    expect(Array.isArray(loaded)).toBe(true);
    expect(loaded[0].email).toBe('fileuser@example.com');

    // cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
