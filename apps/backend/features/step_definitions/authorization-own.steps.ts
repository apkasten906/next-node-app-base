import { Given, Then, When } from '@cucumber/cucumber';

import '../../src/container';

import { AuditAction, AuditLogService } from '../../src/services/audit/audit-log.service';
import { AuthorizationService } from '../../src/services/auth/authorization.service';
import { expect } from '../support/assertions';
import { World } from '../support/world';

Given('AuthorizationService and AuditLogService are configured', async function (this: World) {
  const container = this.getContainer();
  const authz = container.resolve(AuthorizationService);
  const audit = container.resolve(AuditLogService);

  // Ensure deterministic state.
  authz.resetForTests();
  audit.clear();

  this.setData('authz', authz);
  this.setData('audit', audit);
});

When(
  'user {string} is granted permission {string}',
  async function (this: World, userId: string, permission: string) {
    const authz = this.getData<AuthorizationService>('authz');
    if (!authz) {
      throw new Error('AuthorizationService was not initialized in the World');
    }

    // Clear any previous state to make the scenario deterministic.
    authz.resetForTests();

    await authz.grantPermission(userId, permission);

    this.setData('authzUserId', userId);
    this.setData('authzPermission', permission);
  }
);

Then(
  'user {string} should be allowed to access {string} {string} when ownerId is {string}',
  async function (this: World, userId: string, resource: string, action: string, ownerId: string) {
    const authz = this.getData<AuthorizationService>('authz');
    if (!authz) {
      throw new Error('AuthorizationService was not initialized in the World');
    }

    const allowed = await authz.canAccess(userId, resource, action, { ownerId });
    expect(allowed).toBe(true);
  }
);

Then(
  'user {string} should be denied to access {string} {string} when ownerId is {string}',
  async function (this: World, userId: string, resource: string, action: string, ownerId: string) {
    const authz = this.getData<AuthorizationService>('authz');
    if (!authz) {
      throw new Error('AuthorizationService was not initialized in the World');
    }

    const allowed = await authz.canAccess(userId, resource, action, { ownerId });
    expect(allowed).toBe(false);
  }
);

Then(
  'audit logs for {string} should include both granted and denied decisions',
  async function (this: World, userId: string) {
    const audit = this.getData<AuditLogService>('audit');
    if (!audit) {
      throw new Error('AuditLogService was not initialized in the World');
    }

    const logs = await audit.getLogs({ userId });
    const actions = logs.map((l) => l.action);

    expect(actions).toContain(AuditAction.ACCESS_GRANTED);
    expect(actions).toContain(AuditAction.ACCESS_DENIED);
  }
);
