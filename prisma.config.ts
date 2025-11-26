// Prisma 7 configuration for CLI tools (migrate, db push, etc.)
// This file is at the monorepo root and references the backend schema
// Runtime configuration uses adapter pattern in database.service.ts

module.exports = {
  schema: './apps/backend/prisma/schema.prisma',
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/nextnode?schema=public',
    },
  },
};
