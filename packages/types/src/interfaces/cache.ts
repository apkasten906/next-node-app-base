import { CacheLevel } from '../types/common';

/**
 * Cache service interface for multi-level caching
 */
export interface ICacheService {
  /**
   * Get value from cache
   */
  get<T>(key: string, level?: CacheLevel): Promise<T | null>;

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number, level?: CacheLevel): Promise<void>;

  /**
   * Delete value from cache
   */
  delete(key: string, level?: CacheLevel): Promise<void>;

  /**
   * Check if key exists in cache
   */
  exists(key: string, level?: CacheLevel): Promise<boolean>;

  /**
   * Invalidate cache by pattern
   */
  invalidate(pattern: string): Promise<void>;

  /**
   * Clear all cache
   */
  clear(level?: CacheLevel): Promise<void>;

  /**
   * Get multiple values
   */
  mget<T>(keys: string[], level?: CacheLevel): Promise<Map<string, T>>;

  /**
   * Set multiple values
   */
  mset<T>(entries: Map<string, T>, ttl?: number, level?: CacheLevel): Promise<void>;

  /**
   * Get cache statistics
   */
  getStats(level?: CacheLevel): Promise<CacheStats>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
  memoryUsage?: number;
}

export interface CacheOptions {
  ttl?: number;
  level?: CacheLevel;
  tags?: string[];
}

export interface CacheConfig {
  l1?: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
  l2?: {
    enabled: boolean;
    host: string;
    port: number;
    ttl: number;
  };
  l3?: {
    enabled: boolean;
    provider: string;
    ttl: number;
  };
}
