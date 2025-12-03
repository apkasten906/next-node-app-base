import { AuthorizationContext, IAuthorizationService, Policy, PolicyContext } from '@repo/types';
import { inject, injectable } from 'tsyringe';

import { AuditAction, AuditLogService } from '../audit/audit-log.service';

import { PolicyEngine } from './policy-engine.service';
import { InMemoryPolicyStore } from './policy-store.service';

/**
 * Authorization service for RBAC/ABAC
 * This is a basic implementation - in production, this would integrate with a database
 */
@injectable()
export class AuthorizationService implements IAuthorizationService {
  // In-memory storage for demonstration
  // In production, this would use a database
  private userRoles: Map<string, Set<string>> = new Map();
  private userPermissions: Map<string, Set<string>> = new Map();
  private rolePermissions: Map<string, Set<string>> = new Map();

  constructor(
    @inject(AuditLogService) private audit?: AuditLogService,
    @inject(PolicyEngine) private policyEngine?: PolicyEngine,
    @inject(InMemoryPolicyStore) private policyStore?: InMemoryPolicyStore,
  ) {
    // Initialize default role-permission mappings
    this.initializeDefaultRoles();
    // Initialize example ABAC policies
    void this.policyStore?.initializeExamplePolicies();
  }

  /**
   * Check if user has required role
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    const roles = this.userRoles.get(userId);
    return roles?.has(role) || false;
  }

  /**
   * Check if user has required permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    // Check direct permissions
    const userPerms = this.userPermissions.get(userId);
    if (userPerms?.has(permission)) {
      return true;
    }

    // Check role-based permissions
    const roles = await this.getUserRoles(userId);
    for (const role of roles) {
      const rolePerms = this.rolePermissions.get(role);
      if (rolePerms?.has(permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user can access resource with specific action
   */
  async canAccess(
    userId: string,
    resource: string,
    action: string,
    context?: { ownerId?: string }
  ): Promise<boolean> {
    const permission = `${resource}:${action}`;

    // Direct permission
    const direct = await this.hasPermission(userId, permission);
    if (direct) {
      // audit allow
      try {
        await this.audit?.logAuthz({
          userId,
          action: AuditAction.ACCESS_GRANTED,
          resource,
          success: true,
        });
      } catch {
        // Audit logging is optional - continue on error
      }
      return true;
    }

    // Support "own" permissions like `resource:action:own`
    const ownPermission = `${permission}:own`;
    const hasOwn = await this.hasPermission(userId, ownPermission);
    if (hasOwn && context?.ownerId && context.ownerId === userId) {
      try {
        await this.audit?.logAuthz({
          userId,
          action: AuditAction.ACCESS_GRANTED,
          resource,
          resourceId: context.ownerId,
          success: true,
        });
      } catch {
        // Audit logging is optional - continue on error
      }
      return true;
    }

    // audit deny
    try {
      await this.audit?.logAuthz({
        userId,
        action: AuditAction.ACCESS_DENIED,
        resource,
        success: false,
      });
    } catch {
      // Audit logging is optional - continue on error
    }
    return false;
  }

  /**
   * Check if user can access resource with full ABAC context
   */
  async canAccessWithContext(context: AuthorizationContext): Promise<boolean> {
    // First, try RBAC with legacy canAccess method
    const rbacAllowed = await this.canAccess(
      context.userId,
      context.resource,
      context.action,
      context.attributes,
    );

    if (!rbacAllowed && this.policyEngine && this.policyStore) {
      // If RBAC denies, try ABAC policies
      const policies = await this.policyStore.findApplicablePolicies({
        user: context.userAttributes || { id: context.userId },
        resource: context.resourceAttributes || { type: context.resource },
        environment: context.environmentAttributes || {},
        action: context.action,
      });

      if (policies.length > 0) {
        const policyContext: PolicyContext = {
          user: context.userAttributes || { id: context.userId },
          resource: context.resourceAttributes || { type: context.resource },
          environment: context.environmentAttributes || {},
          action: context.action,
        };

        const result = await this.policyEngine.evaluatePolicies(policies, policyContext);

        // Log ABAC evaluation result
        try {
          await this.audit?.logAuthz({
            userId: context.userId,
            action:
              result.effect === 'allow'
                ? AuditAction.ACCESS_GRANTED
                : AuditAction.ACCESS_DENIED,
            resource: context.resource,
            success: result.effect === 'allow',
            metadata: {
              evaluationMethod: 'ABAC',
              matchedRules: result.matchedRules,
              reason: result.reason,
            },
          });
        } catch {
          // Audit logging is optional - continue on error
        }

        return result.effect === 'allow';
      }
    }

    return rbacAllowed;
  }

  /**
   * Add a policy (ABAC)
   */
  async addPolicy(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.policyStore) {
      throw new Error('Policy store not available');
    }
    await this.policyStore.createPolicy(policy);
  }

  /**
   * Remove a policy (ABAC)
   */
  async removePolicy(policyId: string): Promise<void> {
    if (!this.policyStore) {
      throw new Error('Policy store not available');
    }
    await this.policyStore.deletePolicy(policyId);
  }

  /**
   * Reset for tests
   */
  resetForTests(): void {
    this.userRoles.clear();
    this.userPermissions.clear();
    this.rolePermissions.clear();
    void this.policyStore?.reset();
    this.initializeDefaultRoles();
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const roles = this.userRoles.get(userId);
    return roles ? Array.from(roles) : [];
  }

  /**
   * Get user permissions (direct + role-based)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const permissions = new Set<string>();

    // Add direct permissions
    const userPerms = this.userPermissions.get(userId);
    if (userPerms) {
      userPerms.forEach((p) => permissions.add(p));
    }

    // Add role-based permissions
    const roles = await this.getUserRoles(userId);
    for (const role of roles) {
      const rolePerms = this.rolePermissions.get(role);
      if (rolePerms) {
        rolePerms.forEach((p) => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, role: string): Promise<void> {
    const roles = this.userRoles.get(userId) || new Set();
    roles.add(role);
    this.userRoles.set(userId, roles);
  }

  /**
   * Revoke role from user
   */
  async revokeRole(userId: string, role: string): Promise<void> {
    const roles = this.userRoles.get(userId);
    if (roles) {
      roles.delete(role);
      if (roles.size === 0) {
        this.userRoles.delete(userId);
      }
    }
  }

  /**
   * Grant permission to user
   */
  async grantPermission(userId: string, permission: string): Promise<void> {
    const perms = this.userPermissions.get(userId) || new Set();
    perms.add(permission);
    this.userPermissions.set(userId, perms);
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(userId: string, permission: string): Promise<void> {
    const perms = this.userPermissions.get(userId);
    if (perms) {
      perms.delete(permission);
      if (perms.size === 0) {
        this.userPermissions.delete(userId);
      }
    }
  }

  /**
   * Initialize default role-permission mappings
   */
  private initializeDefaultRoles(): void {
    // Admin role
    this.rolePermissions.set(
      'admin',
      new Set([
        'users:create',
        'users:read',
        'users:update',
        'users:delete',
        'posts:create',
        'posts:read',
        'posts:update',
        'posts:delete',
        'settings:read',
        'settings:update',
      ])
    );

    // User role
    this.rolePermissions.set(
      'user',
      new Set([
        'posts:create',
        'posts:read',
        'posts:update:own',
        'posts:delete:own',
        'profile:read',
        'profile:update',
      ])
    );

    // Guest role
    this.rolePermissions.set('guest', new Set(['posts:read', 'profile:read']));
  }
}
