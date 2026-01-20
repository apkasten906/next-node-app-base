import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { singleton } from 'tsyringe';

/**
 * Prisma database service with singleton pattern
 * Manages database connections and provides query interface
 */
@singleton()
export class DatabaseService extends PrismaClient {
  constructor() {
    // Prisma 7: Use PostgreSQL adapter with connection pool
    const connectionString = process.env['DATABASE_URL'] || 'postgresql://localhost:5432/mydb';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    const externalServicesEnabled = process.env['TEST_EXTERNAL_SERVICES'] !== 'false';

    let prismaLog: Array<'query' | 'info' | 'warn' | 'error'>;
    if (!externalServicesEnabled) {
      // Intentionally quiet when running without DB (e.g., E2E)
      prismaLog = ['warn'];
    } else if (process.env['NODE_ENV'] === 'development') {
      prismaLog = ['query', 'info', 'warn', 'error'];
    } else {
      prismaLog = ['error'];
    }

    const errorFormat = externalServicesEnabled ? 'pretty' : 'minimal';

    super({
      adapter,
      // When external services are intentionally disabled (e.g., E2E runs),
      // avoid noisy Prisma query/error logs and keep errors minimal.
      log: prismaLog,
      errorFormat,
    });
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    await this.$connect();
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean database (for testing)
   */
  async cleanDatabase(): Promise<void> {
    if (process.env['NODE_ENV'] !== 'test') {
      throw new Error('Database cleaning is only allowed in test environment');
    }

    const tables = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    for (const { tablename } of tables) {
      if (tablename !== '_prisma_migrations') {
        await this.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      }
    }
  }
}
