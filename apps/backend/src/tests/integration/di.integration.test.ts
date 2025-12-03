import { describe, expect, it } from 'vitest';
import { container } from '../../container';
import { AuthorizationService } from '../../services/auth/authorization.service';
import { JwtService } from '../../services/auth/jwt.service';

describe('Dependency Injection (TSyringe) Integration', () => {
  it('resolves registered singletons and maintains identity', async () => {
    const authz1 = container.resolve(AuthorizationService);
    const authz2 = container.resolve(AuthorizationService);
    expect(authz1).toBeDefined();
    expect(authz1).toBe(authz2); // singleton

    const jwt1 = container.resolve(JwtService);
    const jwt2 = container.resolve(JwtService);
    expect(jwt1).toBeDefined();
    expect(jwt1).toBe(jwt2);
  });
});
