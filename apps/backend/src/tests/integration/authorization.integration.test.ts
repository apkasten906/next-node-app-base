import { describe, expect, it } from 'vitest';
import { AuthorizationService } from '../../services/auth/authorization.service';

describe('Authorization (RBAC) Integration', () => {
  it('assigns roles and evaluates permissions', async () => {
    const authz = new AuthorizationService();

    await authz.assignRole('u1', 'admin');
    const hasRole = await authz.hasRole('u1', 'admin');
    expect(hasRole).toBe(true);

    const canReadUsers = await authz.hasPermission('u1', 'users:read');
    expect(canReadUsers).toBe(true);

    // Grant a direct permission and verify
    await authz.grantPermission('u2', 'posts:create');
    const canCreatePosts = await authz.hasPermission('u2', 'posts:create');
    expect(canCreatePosts).toBe(true);
  });
});
