import { IAuthorizationService } from '@repo/types';
import { injectable } from 'tsyringe';

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

  constructor() {
    // Initialize default role-permission mappings
    this.initializeDefaultRoles();
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
  async canAccess(userId: string, resource: string, action: string): Promise<boolean> {
    const permission = `${resource}:${action}`;
    return this.hasPermission(userId, permission);
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
