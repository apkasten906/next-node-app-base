import { Router, type NextFunction, type Request, type Response } from 'express';
import { container } from 'tsyringe';

import { AuthorizationService } from '../services/auth/authorization.service';
import { DatabaseService } from '../services/database.service';
import { createCollectionLinks, createResourceLinks } from '../utils/hateoas';
import {
  filtersToPrismaWhere,
  getPaginationParams,
  getSkipTake,
  parseFilters,
  parseSorting,
  sortToPrismaOrderBy,
} from '../utils/query-helpers';

const router: import('express').Router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users with pagination
 *     description: Retrieve a paginated list of users with filtering and sorting
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/PageSizeParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/ApiVersionHeader'
 *       - in: query
 *         name: filter[role][eq]
 *         schema:
 *           type: string
 *           enum: [USER, ADMIN]
 *         description: Filter by role
 *       - in: query
 *         name: filter[email][contains]
 *         schema:
 *           type: string
 *         description: Filter by email (case-insensitive)
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 _links:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/HATEOASLink'
 *                 _meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// @ts-expect-error TS7030 - TypeScript doesn't recognize res.json() and next() as terminal statements
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = container.resolve(DatabaseService);
    const authz = container.resolve<AuthorizationService>('AuthorizationService');

    // Check authorization
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasPermission = await authz.hasPermission(userId, 'users:read');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Parse query parameters
    const { page, pageSize, sort } = getPaginationParams(req);
    const filters = parseFilters(req.query);
    const sorting = parseSorting(sort);
    const { skip, take } = getSkipTake(page, pageSize);

    // Build Prisma where clause
    const where = filtersToPrismaWhere(filters);

    // Build Prisma orderBy clause
    const orderBy = sortToPrismaOrderBy(
      sorting.length > 0 ? sorting : [{ field: 'createdAt', order: 'desc' }]
    );

    // Fetch users with pagination
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    // Add HATEOAS links to each user
    const usersWithLinks = users.map((user) =>
      createResourceLinks(req, user.id, '/api/users').build(user)
    );

    // Build paginated response with collection links
    const response = createCollectionLinks(req, '/api/users', page, pageSize, total).buildPaginated(
      usersWithLinks,
      total,
      page,
      pageSize
    );

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve detailed information about a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - $ref: '#/components/parameters/ApiVersionHeader'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 _links:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/HATEOASLink'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = container.resolve(DatabaseService);
    const authz = container.resolve<AuthorizationService>('AuthorizationService');

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const hasPermission = await authz.hasPermission(userId, 'users:read');
    if (!hasPermission) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: req.params['id'] },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    // Build HATEOAS response
    const response = createResourceLinks(req, user.id, '/api/users').build(user);

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User unique identifier
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         name:
 *           type: string
 *           description: User full name
 *         role:
 *           type: string
 *           enum: [USER, ADMIN]
 *           description: User role
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 */

export const usersRouter = router;
