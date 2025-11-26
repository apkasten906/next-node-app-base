import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EncryptionService } from '../../services/auth/encryption.service';

describe('Database Integration Tests', () => {
  let prisma: PrismaClient;
  let encryptionService: EncryptionService;
  let pool: Pool;

  beforeAll(() => {
    // Prisma 7: Initialize with adapter pattern
    const connectionString =
      process.env['DATABASE_URL'] ||
      'postgresql://postgres:postgres@localhost:5432/nextnode?schema=public';
    pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    prisma = new PrismaClient({
      adapter,
    });

    encryptionService = new EncryptionService();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await prisma.$disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-',
        },
      },
    });
  });

  describe('User CRUD Operations', () => {
    it('should create a new user', async () => {
      const hashedPassword = await encryptionService.hash('password123');

      const user = await prisma.user.create({
        data: {
          email: 'test-user@example.com',
          name: 'Test User',
          passwordHash: hashedPassword,
          role: 'USER',
        },
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test-user@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('USER');
    });

    it('should find user by email', async () => {
      const hashedPassword = await encryptionService.hash('password123');

      await prisma.user.create({
        data: {
          email: 'test-find@example.com',
          name: 'Find Test',
          passwordHash: hashedPassword,
          role: 'USER',
        },
      });

      const foundUser = await prisma.user.findUnique({
        where: {
          email: 'test-find@example.com',
        },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('test-find@example.com');
    });

    it('should update user', async () => {
      const hashedPassword = await encryptionService.hash('password123');

      const user = await prisma.user.create({
        data: {
          email: 'test-update@example.com',
          name: 'Update Test',
          passwordHash: hashedPassword,
          role: 'USER',
        },
      });

      const updatedUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          name: 'Updated Name',
        },
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.email).toBe('test-update@example.com');
    });

    it('should delete user', async () => {
      const hashedPassword = await encryptionService.hash('password123');

      const user = await prisma.user.create({
        data: {
          email: 'test-delete@example.com',
          name: 'Delete Test',
          passwordHash: hashedPassword,
          role: 'USER',
        },
      });

      await prisma.user.delete({
        where: {
          id: user.id,
        },
      });

      const deletedUser = await prisma.user.findUnique({
        where: {
          id: user.id,
        },
      });

      expect(deletedUser).toBeNull();
    });

    it('should enforce unique email constraint', async () => {
      const hashedPassword = await encryptionService.hash('password123');

      await prisma.user.create({
        data: {
          email: 'test-unique@example.com',
          name: 'Unique Test',
          passwordHash: hashedPassword,
          role: 'USER',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            email: 'test-unique@example.com',
            name: 'Duplicate',
            passwordHash: hashedPassword,
            role: 'USER',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('User Query Operations', () => {
    beforeEach(async () => {
      const hashedPassword = await encryptionService.hash('password123');

      // Create multiple test users
      await prisma.user.createMany({
        data: [
          {
            email: 'test-query-1@example.com',
            name: 'Query User 1',
            passwordHash: hashedPassword,
            role: 'USER',
          },
          {
            email: 'test-query-2@example.com',
            name: 'Query User 2',
            passwordHash: hashedPassword,
            role: 'USER',
          },
          {
            email: 'test-query-admin@example.com',
            name: 'Query Admin',
            passwordHash: hashedPassword,
            role: 'ADMIN',
          },
        ],
      });
    });

    it('should list all users', async () => {
      const users = await prisma.user.findMany({
        where: {
          email: {
            startsWith: 'test-query-',
          },
        },
      });

      expect(users).toHaveLength(3);
    });

    it('should filter users by role', async () => {
      const admins = await prisma.user.findMany({
        where: {
          email: {
            startsWith: 'test-query-',
          },
          role: 'ADMIN',
        },
      });

      expect(admins).toHaveLength(1);
      expect(admins[0].email).toBe('test-query-admin@example.com');
    });

    it('should paginate users', async () => {
      const page1 = await prisma.user.findMany({
        where: {
          email: {
            startsWith: 'test-query-',
          },
        },
        take: 2,
        skip: 0,
      });

      const page2 = await prisma.user.findMany({
        where: {
          email: {
            startsWith: 'test-query-',
          },
        },
        take: 2,
        skip: 2,
      });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
    });

    it('should count users', async () => {
      const count = await prisma.user.count({
        where: {
          email: {
            startsWith: 'test-query-',
          },
        },
      });

      expect(count).toBe(3);
    });
  });

  describe('Transaction Operations', () => {
    it('should rollback on error', async () => {
      const hashedPassword = await encryptionService.hash('password123');

      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.create({
            data: {
              email: 'test-transaction@example.com',
              name: 'Transaction Test',
              passwordHash: hashedPassword,
              role: 'USER',
            },
          });

          // This should cause the transaction to rollback
          throw new Error('Intentional error');
        });
      } catch (error) {
        // Expected to catch error
      }

      const user = await prisma.user.findUnique({
        where: {
          email: 'test-transaction@example.com',
        },
      });

      expect(user).toBeNull();
    });

    it('should commit successful transaction', async () => {
      const hashedPassword = await encryptionService.hash('password123');

      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            email: 'test-commit@example.com',
            name: 'Commit Test',
            passwordHash: hashedPassword,
            role: 'USER',
          },
        });
      });

      const user = await prisma.user.findUnique({
        where: {
          email: 'test-commit@example.com',
        },
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe('test-commit@example.com');
    });
  });
});

