import { beforeEach, describe, expect, it } from 'vitest';
import { container } from '../../container';
import { AuditAction, AuditLogService } from '../../services/audit/audit-log.service';
import { AuthorizationService } from '../../services/auth/authorization.service';

describe('AuthorizationService — owner semantics and audit logging', () => {
  let auth: AuthorizationService;
  let audit: AuditLogService;

  beforeEach(() => {
    auth = container.resolve(AuthorizationService);
    audit = container.resolve(AuditLogService);
    // Ensure both authorization and audit state are clean for each test
    auth.resetForTests();
    audit.clear();
  });

  it('assigns roles, grants permissions, honors :own semantics, and records audit logs', async () => {
    const userId = 'user-123';

    const initialLogs = await audit.getLogs();

    // Assign role that grants posts:create
    await auth.assignRole(userId, 'user');
    const canCreate = await auth.canAccess(userId, 'posts', 'create');
    expect(canCreate).toBe(true);

    // Direct grant
    await auth.grantPermission(userId, 'settings:update');
    const canUpdateSettings = await auth.canAccess(userId, 'settings', 'update');
    expect(canUpdateSettings).toBe(true);

    // Owner semantics: grant only own update permission and verify owner check
    // Reset roles/permissions to isolate
    auth.resetForTests();
    await auth.grantPermission(userId, 'posts:update:own');

    // User updating their own post -> allowed
    const allowOwn = await auth.canAccess(userId, 'posts', 'update', { ownerId: userId });
    expect(allowOwn).toBe(true);

    // User updating someone else's post -> denied
    const denyOther = await auth.canAccess(userId, 'posts', 'update', { ownerId: 'someone-else' });
    expect(denyOther).toBe(false);

    // Audit logs should have been recorded for the actions above
    const logs = await audit.getLogs({ userId });
    const actions = logs.map((l) => l.action);

    expect(actions).toContain(AuditAction.ACCESS_GRANTED);
    expect(actions).toContain(AuditAction.ACCESS_DENIED);
  });
});

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
