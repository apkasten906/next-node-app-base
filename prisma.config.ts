// Prisma 7 configuration for CLI tools (migrate, db push, etc.)
// This file is at the monorepo root and references the backend schema
// Runtime configuration uses adapter pattern in database.service.ts

import { defineConfig, env } from '@prisma/config';
import path from 'node:path';

export default defineConfig({
  schema: path.join(__dirname, 'apps', 'backend', 'prisma', 'schema.prisma'),
  datasource: {
    url:
      env('DATABASE_URL') || 'postgresql://postgres:postgres@localhost:5432/nextnode?schema=public',
  },
});
