import { Router, type Request, type Response } from 'express';
import { container } from 'tsyringe';
import { AuditLogService } from '../services/audit/audit-log.service';
import { AuthorizationService } from '../services/auth/authorization.service';
import { DatabaseService } from '../services/database.service';

const router = Router();

/**
 * Get all users (admin only)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = container.resolve(DatabaseService);
    const authz = container.resolve<AuthorizationService>('AuthorizationService');

    // Check authorization
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasPermission = await authz.checkPermission(userId, 'users', 'read');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get single user by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = container.resolve(DatabaseService);
    const authz = container.resolve<AuthorizationService>('AuthorizationService');
    const audit = container.resolve<AuditLogService>('AuditLogService');

    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Users can view their own profile, admins can view anyone
    const isOwnProfile = userId === id;
    const hasPermission = await authz.checkPermission(userId, 'users', 'read');

    if (!isOwnProfile && !hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        profile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await audit.log({
      userId,
      action: 'READ',
      resource: 'user',
      resourceId: id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update user
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const db = container.resolve(DatabaseService);
    const authz = container.resolve<AuthorizationService>('AuthorizationService');
    const audit = container.resolve<AuditLogService>('AuditLogService');

    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { name, image } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Users can update their own profile, admins can update anyone
    const isOwnProfile = userId === id;
    const hasPermission = await authz.checkPermission(userId, 'users', 'update');

    if (!isOwnProfile && !hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await db.user.update({
      where: { id },
      data: {
        name,
        image,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        updatedAt: true,
      },
    });

    await audit.log({
      userId,
      action: 'UPDATE',
      resource: 'user',
      resourceId: id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { fields: Object.keys({ name, image }) },
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete user (admin only)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = container.resolve(DatabaseService);
    const authz = container.resolve<AuthorizationService>('AuthorizationService');
    const audit = container.resolve<AuditLogService>('AuditLogService');

    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasPermission = await authz.checkPermission(userId, 'users', 'delete');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Prevent self-deletion
    if (userId === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await db.user.delete({
      where: { id },
    });

    await audit.log({
      userId,
      action: 'DELETE',
      resource: 'user',
      resourceId: id,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
