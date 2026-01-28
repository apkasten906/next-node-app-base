import Redis from 'ioredis';
import { inject, singleton } from 'tsyringe';

import { LoggerService } from './logger.service';

/**
 * Common interface for Redis operations
 * Implemented by both ioredis and MockRedis
 */
interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<string>;
  setex(key: string, ttl: number, value: string): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<number>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  flushdb(): Promise<string>;
  ping(): Promise<string>;
  quit(): Promise<string>;
  on(event: string, listener: (...args: unknown[]) => void): void;
}

// Minimal in-memory mock implementing the Redis subset used in tests
class MockRedis implements IRedisClient {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<string> {
    this.store.set(key, value);
    return 'OK';
  }

  async setex(key: string, _ttl: number, value: string): Promise<string> {
    this.store.set(key, value);
    // TTL ignored for mock
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async expire(_key: string, _ttl: number): Promise<number> {
    return 1;
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return keys.map((k) => this.store.get(k) ?? null);
  }

  async flushdb(): Promise<string> {
    this.store.clear();
    return 'OK';
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async quit(): Promise<string> {
    return 'OK';
  }

  // Event handlers compatibility stubs
  on(): void {
    // no-op for mock
  }
}

/**
 * Redis caching service with DI
 * Implements cache-aside pattern
 */
@singleton()
export class CacheService {
  private client: IRedisClient;

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
    const defaultOptions: {
      retryStrategy: (times: number) => number | null;
      maxRetriesPerRequest: number;
      enableOfflineQueue: boolean;
      connectTimeout: number;
    } = {
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
    try {
      await this.client.quit();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Connection is closed')) {
        return;
      }
      this.logger.warn('Cache disconnect error', { message });
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): IRedisClient {
    return this.client;
  }
}
