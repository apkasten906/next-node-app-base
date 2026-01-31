import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import router from './bdd-admin.routes';

function makeAppWithUser(user: Request['user'] | undefined) {
  const app = express();

  // Minimal middleware to simulate auth
  app.use((req: Request, _res: Response, next) => {
    req.user = user;
    next();
  });

  app.use('/api/admin/bdd', router);
  return app;
}

describe('unit: /api/admin/bdd/status', () => {
  it('returns 401 when unauthenticated', async () => {
    const app = makeAppWithUser(undefined);
    const res = await request(app).get('/api/admin/bdd/status');
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-admin', async () => {
    const app = makeAppWithUser({
      userId: 'u1',
      email: 'test@example.com',
      roles: ['USER'],
      permissions: [],
      iat: 0,
      exp: 0,
    });
    const res = await request(app).get('/api/admin/bdd/status');
    expect(res.status).toBe(403);
  });

  it('returns a snapshot when admin', async () => {
    const app = makeAppWithUser({
      userId: 'admin',
      email: 'admin@example.com',
      roles: ['ADMIN'],
      permissions: [],
      iat: 0,
      exp: 0,
    });

    const res = await request(app).get('/api/admin/bdd/status');
    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty('generatedAt');
    expect(res.body).toHaveProperty('overall');
    expect(res.body.overall).toHaveProperty('total');
    expect(res.body).toHaveProperty('apps');
    expect(Array.isArray(res.body.apps)).toBe(true);

    expect(res.body).toHaveProperty('features');
    expect(Array.isArray(res.body.features)).toBe(true);

    expect(res.body).toHaveProperty('implAudit');
    expect(res.body.implAudit).toHaveProperty('implTagsTotal');
    expect(res.body.implAudit).toHaveProperty('missingReadyImplCount');
  });
});
