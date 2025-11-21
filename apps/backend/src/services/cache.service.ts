import Redis from 'ioredis';
import { inject, singleton } from 'tsyringe';
import { LoggerService } from './logger.service';

/**
 * Redis caching service with DI
 * Implements cache-aside pattern
 */
@singleton()
export class CacheService {
  private client: Redis;

  constructor(@inject(LoggerService) private logger: LoggerService) {
    this.client = new Redis(process.env['REDIS_URL'] || 'redis://localhost:6379', {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.info('Redis client connected');
    });

    this.client.on('error', (err: Error) => {
      this.logger.error('Redis client error', err);
    });

    this.client.on('reconnecting', () => {
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
      return values.map((v) => (v ? (JSON.parse(v) as T) : null));
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
  getClient(): Redis {
    return this.client;
  }
}
