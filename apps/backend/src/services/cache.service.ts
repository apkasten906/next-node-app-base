import Redis from 'ioredis';
import { inject, singleton } from 'tsyringe';

import { LoggerService } from './logger.service';

// Minimal in-memory mock implementing the Redis subset used in tests
class MockRedis {
  private store = new Map<string, string>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
    return 'OK';
  }

  async setex(key: string, _ttl: number, value: string) {
    this.store.set(key, value);
    // TTL ignored for mock
    return 'OK';
  }

  async del(key: string) {
    return this.store.delete(key) ? 1 : 0;
  }

  async exists(key: string) {
    return this.store.has(key) ? 1 : 0;
  }

  async expire(_key: string, _ttl: number) {
    return 1;
  }

  async mget(...keys: string[]) {
    return keys.map((k) => this.store.get(k) ?? null);
  }

  async flushdb() {
    this.store.clear();
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }

  async quit() {
    return 'OK';
  }

  // Event handlers compatibility stubs
  on() {
    // no-op for mock
  }
}

/**
 * Redis caching service with DI
 * Implements cache-aside pattern
 */
@singleton()
export class CacheService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Redis client can be MockRedis or ioredis, both with compatible interfaces
  private client: any;

  constructor(@inject(LoggerService) private logger: LoggerService) {
    const disableExternal =
      process.env['TEST_EXTERNAL_SERVICES'] === 'false' || process.env['REDIS_MOCK'] === 'true';

    if (disableExternal) {
      // Use in-memory mock to avoid long reconnect loops in tests
      this.client = new MockRedis();
      this.logger.info('Using MockRedis for tests');
      return;
    }

    // Default Redis options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Redis constructor options vary by version
    const defaultOptions: any = {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      connectTimeout: 10000,
    };

    // Shorten retries / disable offline queue during test runs to fail fast
    if (process.env['NODE_ENV'] === 'test') {
      defaultOptions.maxRetriesPerRequest = 1;
      defaultOptions.retryStrategy = () => null; // stop retrying
      defaultOptions.enableOfflineQueue = false;
      defaultOptions.connectTimeout = 1000;
    }

    this.client = new Redis(process.env['REDIS_URL'] || 'redis://localhost:6379', defaultOptions);

    // Attach event handlers only if using real Redis
    (this.client as Redis).on('connect', () => {
      this.logger.info('Redis client connected');
    });

    (this.client as Redis).on('error', (err: Error) => {
      this.logger.error('Redis client error', err);
    });

    (this.client as Redis).on('reconnecting', () => {
      this.logger.warn('Redis client reconnecting');
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key: ${key}`, error as Error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL (seconds)
   */
  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key: ${key}`, error as Error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Cache delete error for key: ${key}`, error as Error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key: ${key}`, error as Error);
      return false;
    }
  }

  /**
   * Set key expiration (seconds)
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      this.logger.error(`Cache expire error for key: ${key}`, error as Error);
      return false;
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    try {
      const values = await this.client.mget(...keys);
      return values.map((v: string | null) => (v ? (JSON.parse(v) as T) : null));
    } catch (error) {
      this.logger.error(`Cache mget error for keys: ${keys.join(', ')}`, error as Error);
      return keys.map(() => null);
    }
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<boolean> {
    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      this.logger.error('Cache flush error', error as Error);
      return false;
    }
  }

  /**
   * Check cache health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Get Redis client instance
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Returns MockRedis or ioredis instance
  getClient(): any {
    return this.client;
  }
}
