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

    super({
      adapter,
      log:
        process.env['NODE_ENV'] === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty',
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
