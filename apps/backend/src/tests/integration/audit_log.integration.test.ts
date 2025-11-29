import { describe, expect, it } from 'vitest';
import { AuditAction, AuditLogService } from '../../services/audit/audit-log.service';

describe('Audit Log Integration', () => {
  it('records and retrieves audit log entries', async () => {
    const audit = new AuditLogService();

    await audit.logAuth({
      userId: 'user-1',
      action: AuditAction.LOGIN,
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    });

    await audit.logAuthz({
      userId: 'user-1',
      action: AuditAction.ACCESS_GRANTED,
      resource: 'users',
      resourceId: 'user-1',
      success: true,
    });

    const logs = await audit.getLogs({ userId: 'user-1' });
    expect(logs.length).toBeGreaterThanOrEqual(2);

    const actions = logs.map((l) => l.action);
    expect(actions).toContain(AuditAction.LOGIN);
    expect(actions).toContain(AuditAction.ACCESS_GRANTED);
  });
});
