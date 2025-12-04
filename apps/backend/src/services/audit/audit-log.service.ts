import { injectable } from 'tsyringe';

export interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export enum AuditAction {
  // Authentication
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  LOGIN_FAILED = 'auth.login_failed',
  TOKEN_REFRESH = 'auth.token_refresh',
  PASSWORD_CHANGE = 'auth.password_change',
  PASSWORD_RESET = 'auth.password_reset',

  // Authorization
  ACCESS_GRANTED = 'authz.access_granted',
  ACCESS_DENIED = 'authz.access_denied',
  ROLE_ASSIGNED = 'authz.role_assigned',
  ROLE_REVOKED = 'authz.role_revoked',
  PERMISSION_GRANTED = 'authz.permission_granted',
  PERMISSION_REVOKED = 'authz.permission_revoked',

  // Data operations
  CREATE = 'data.create',
  READ = 'data.read',
  UPDATE = 'data.update',
  DELETE = 'data.delete',

  // Security events
  ENCRYPTION_KEY_ROTATION = 'security.key_rotation',
  SECRET_ACCESS = 'security.secret_access',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
}

/**
 * Audit logging service for security events
 * In production, this would write to a secure audit log storage
 */
@injectable()
export class AuditLogService {
  private logs: AuditLogEntry[] = [];

  /**
   * Log security event
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.logs.push(logEntry);

    // In production:
    // - Write to database with retention policy
    // - Send to SIEM system
    // - Trigger alerts for critical events
    // - Ensure immutability of logs
    // eslint-disable-next-line no-console -- Development audit log output (replace with proper logging in production)
    console.log('[AUDIT]', JSON.stringify(logEntry));
  }

  /**
   * Log authentication event
   */
  async logAuth(params: {
    userId?: string;
    action: AuditAction;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      ...params,
      resource: 'authentication',
    });
  }

  /**
   * Log authorization event
   */
  async logAuthz(params: {
    userId: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      ...params,
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(params: {
    userId: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    success: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      ...params,
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(params: {
    userId?: string;
    action: AuditAction;
    resource: string;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      ...params,
    });
  }

  /**
   * Clear in-memory logs (test helper)
   */
  clear(): void {
    this.logs.length = 0;
  }

  /**
   * Get audit logs (with pagination and filtering)
   * In production, this would query from persistent storage
   */
  async getLogs(filter?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    let filtered = this.logs;

    if (filter?.userId) {
      filtered = filtered.filter((log) => log.userId === filter.userId);
    }

    if (filter?.action) {
      filtered = filtered.filter((log) => log.action === filter.action);
    }

    if (filter?.resource) {
      filtered = filtered.filter((log) => log.resource === filter.resource);
    }

    if (filter?.startDate) {
      const startDate = filter.startDate;
      filtered = filtered.filter((log) => log.timestamp >= startDate);
    }

    if (filter?.endDate) {
      const endDate = filter.endDate;
      filtered = filtered.filter((log) => log.timestamp <= endDate);
    }

    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }
}
