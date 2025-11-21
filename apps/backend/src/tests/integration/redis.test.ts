import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';

describe('Redis Integration Tests', () => {
  let redis: Redis;

  beforeAll(() => {
    // Initialize Redis client for testing
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: parseInt(process.env.REDIS_DB || '1'), // Use separate DB for tests
    });
  });

  afterAll(async () => {
    // Clean up test keys
    const keys = await redis.keys('test:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.quit();
  });

  describe('Basic Operations', () => {
    it('should set and get a string value', async () => {
      await redis.set('test:string', 'hello world');
      const value = await redis.get('test:string');

      expect(value).toBe('hello world');
    });

    it('should set with expiration', async () => {
      await redis.setex('test:expiring', 1, 'temporary');
      const value = await redis.get('test:expiring');

      expect(value).toBe('temporary');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const expiredValue = await redis.get('test:expiring');
      expect(expiredValue).toBeNull();
    });

    it('should delete a key', async () => {
      await redis.set('test:delete', 'to be deleted');
      await redis.del('test:delete');

      const value = await redis.get('test:delete');
      expect(value).toBeNull();
    });

    it('should check if key exists', async () => {
      await redis.set('test:exists', 'value');

      const exists = await redis.exists('test:exists');
      expect(exists).toBe(1);

      const notExists = await redis.exists('test:not-exists');
      expect(notExists).toBe(0);
    });

    it('should increment numeric values', async () => {
      await redis.set('test:counter', '0');
      await redis.incr('test:counter');
      await redis.incr('test:counter');

      const value = await redis.get('test:counter');
      expect(value).toBe('2');
    });
  });

  describe('Hash Operations', () => {
    it('should set and get hash fields', async () => {
      await redis.hset('test:hash', 'field1', 'value1');
      await redis.hset('test:hash', 'field2', 'value2');

      const value1 = await redis.hget('test:hash', 'field1');
      const value2 = await redis.hget('test:hash', 'field2');

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
    });

    it('should get all hash fields', async () => {
      await redis.hmset('test:user', {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
      });

      const user = await redis.hgetall('test:user');

      expect(user).toEqual({
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    it('should delete hash field', async () => {
      await redis.hset('test:hash-del', 'field1', 'value1');
      await redis.hdel('test:hash-del', 'field1');

      const value = await redis.hget('test:hash-del', 'field1');
      expect(value).toBeNull();
    });
  });

  describe('List Operations', () => {
    it('should push and pop from list', async () => {
      await redis.rpush('test:list', 'item1', 'item2', 'item3');

      const length = await redis.llen('test:list');
      expect(length).toBe(3);

      const item = await redis.lpop('test:list');
      expect(item).toBe('item1');

      const remaining = await redis.llen('test:list');
      expect(remaining).toBe(2);
    });

    it('should get list range', async () => {
      await redis.rpush('test:range', 'a', 'b', 'c', 'd', 'e');

      const range = await redis.lrange('test:range', 0, 2);
      expect(range).toEqual(['a', 'b', 'c']);

      const all = await redis.lrange('test:range', 0, -1);
      expect(all).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('should trim list', async () => {
      await redis.rpush('test:trim', '1', '2', '3', '4', '5');
      await redis.ltrim('test:trim', 0, 2);

      const trimmed = await redis.lrange('test:trim', 0, -1);
      expect(trimmed).toEqual(['1', '2', '3']);
    });
  });

  describe('Set Operations', () => {
    it('should add and get set members', async () => {
      await redis.sadd('test:set', 'member1', 'member2', 'member3');

      const members = await redis.smembers('test:set');
      expect(members).toHaveLength(3);
      expect(members).toContain('member1');
      expect(members).toContain('member2');
      expect(members).toContain('member3');
    });

    it('should check set membership', async () => {
      await redis.sadd('test:members', 'apple', 'banana');

      const isMember = await redis.sismember('test:members', 'apple');
      expect(isMember).toBe(1);

      const notMember = await redis.sismember('test:members', 'orange');
      expect(notMember).toBe(0);
    });

    it('should remove set member', async () => {
      await redis.sadd('test:remove-set', 'item1', 'item2');
      await redis.srem('test:remove-set', 'item1');

      const members = await redis.smembers('test:remove-set');
      expect(members).toEqual(['item2']);
    });
  });

  describe('Sorted Set Operations', () => {
    it('should add and get sorted set members', async () => {
      await redis.zadd('test:scores', 100, 'player1', 200, 'player2', 150, 'player3');

      const range = await redis.zrange('test:scores', 0, -1);
      expect(range).toEqual(['player1', 'player3', 'player2']);
    });

    it('should get members by score range', async () => {
      await redis.zadd('test:leaderboard', 10, 'user1', 20, 'user2', 30, 'user3');

      const range = await redis.zrangebyscore('test:leaderboard', 15, 30);
      expect(range).toEqual(['user2', 'user3']);
    });

    it('should get member rank', async () => {
      await redis.zadd('test:ranking', 100, 'a', 200, 'b', 150, 'c');

      const rank = await redis.zrank('test:ranking', 'c');
      expect(rank).toBe(1); // 0-indexed, so 'c' is second
    });

    it('should increment score', async () => {
      await redis.zadd('test:points', 10, 'player');
      await redis.zincrby('test:points', 5, 'player');

      const score = await redis.zscore('test:points', 'player');
      expect(score).toBe('15');
    });
  });

  describe('Cache Pattern', () => {
    it('should implement cache-aside pattern', async () => {
      const cacheKey = 'test:cache:user:123';

      // Check cache (miss)
      let cached = await redis.get(cacheKey);
      expect(cached).toBeNull();

      // Simulate DB fetch
      const userData = { id: '123', name: 'Cached User' };

      // Store in cache
      await redis.setex(cacheKey, 60, JSON.stringify(userData));

      // Check cache (hit)
      cached = await redis.get(cacheKey);
      expect(cached).toBeDefined();

      const parsed = JSON.parse(cached!);
      expect(parsed).toEqual(userData);
    });

    it('should invalidate cache', async () => {
      const cacheKey = 'test:cache:invalidate';

      await redis.setex(cacheKey, 60, 'cached data');

      // Invalidate
      await redis.del(cacheKey);

      const value = await redis.get(cacheKey);
      expect(value).toBeNull();
    });
  });

  describe('Pub/Sub Operations', () => {
    it('should publish and subscribe to channels', async () => {
      const subscriber = redis.duplicate();
      const messages: string[] = [];

      await subscriber.subscribe('test:channel');

      subscriber.on('message', (channel, message) => {
        messages.push(message);
      });

      // Wait for subscription to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      await redis.publish('test:channel', 'Hello');
      await redis.publish('test:channel', 'World');

      // Wait for messages to arrive
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages).toEqual(['Hello', 'World']);

      await subscriber.unsubscribe('test:channel');
      await subscriber.quit();
    });
  });
});
