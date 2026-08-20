import type { IFeatureFlagService, TokenPayload } from '@repo/types';
import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { container } from 'tsyringe';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import '../container';
import { FeatureFlagService } from '../services/feature-flags/feature-flag.service';
import router from './feature-flags.routes';

const originalService = container.resolve<IFeatureFlagService>('IFeatureFlagService');

function makeApp(user?: TokenPayload) {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next) => {
    req.user = user;
    next();
  });
  app.use('/api/feature-flags', router);
  return app;
}

const admin: TokenPayload = {
  userId: 'admin-1',
  email: 'admin@example.com',
  roles: ['ADMIN'],
  permissions: [],
  iat: 0,
  exp: 0,
};

describe('feature flag routes', () => {
  beforeEach(() => {
    container.registerInstance<IFeatureFlagService>(
      'IFeatureFlagService',
      new FeatureFlagService()
    );
  });

  afterAll(() => {
    container.registerInstance<IFeatureFlagService>('IFeatureFlagService', originalService);
  });

  it('allows evaluation without admin access and uses the caller identity', async () => {
    const service = container.resolve<IFeatureFlagService>('IFeatureFlagService');
    await service.create({
      key: 'preview',
      defaultValue: false,
      rules: [
        {
          attribute: 'userId',
          operator: 'equals',
          comparisonValue: 'user-1',
          value: true,
        },
      ],
    });
    const user = { ...admin, userId: 'user-1', roles: ['USER'] };

    const response = await request(makeApp(user))
      .post('/api/feature-flags/preview/evaluate')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ value: true, reason: 'targeting_match' });
  });

  it('rejects attempts to provide a userId in an evaluation payload', async () => {
    const response = await request(makeApp())
      .post('/api/feature-flags/preview/evaluate')
      .send({ userId: 'someone-else' });

    expect(response.status).toBe(400);
  });

  it('requires authentication and a feature-manager role for management', async () => {
    const unauthenticated = await request(makeApp()).get('/api/feature-flags');
    const forbidden = await request(makeApp({ ...admin, roles: ['USER'] })).get(
      '/api/feature-flags'
    );

    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(403);
  });

  it('allows moderators to manage feature flags', async () => {
    const moderator = { ...admin, userId: 'moderator-1', roles: ['MODERATOR'] };
    const app = makeApp(moderator);

    const created = await request(app)
      .post('/api/feature-flags')
      .send({ key: 'moderated-feature', defaultValue: false });
    const updated = await request(app)
      .patch('/api/feature-flags/moderated-feature')
      .send({ enabled: false });
    const deleted = await request(app).delete('/api/feature-flags/moderated-feature');

    expect(created.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(deleted.status).toBe(204);
  });

  it('creates, lists, gets, updates, and deletes a flag as admin', async () => {
    const app = makeApp(admin);
    const created = await request(app).post('/api/feature-flags').send({
      key: 'new-navigation',
      description: 'Enable the new navigation',
      defaultValue: false,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ key: 'new-navigation', enabled: true });

    const listed = await request(app).get('/api/feature-flags');
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);

    const fetched = await request(app).get('/api/feature-flags/new-navigation');
    expect(fetched.status).toBe(200);

    const updated = await request(app)
      .patch('/api/feature-flags/new-navigation')
      .send({ enabled: false });
    expect(updated.status).toBe(200);
    expect(updated.body.enabled).toBe(false);

    const deleted = await request(app).delete('/api/feature-flags/new-navigation');
    expect(deleted.status).toBe(204);
    expect(await request(app).get('/api/feature-flags/new-navigation')).toHaveProperty(
      'status',
      404
    );
  });

  it('rejects invalid keys, unknown fields, empty patches, and malformed rules', async () => {
    const app = makeApp(admin);
    const invalidKey = await request(app)
      .post('/api/feature-flags')
      .send({ key: 'INVALID KEY', defaultValue: false });
    const unknownField = await request(app)
      .post('/api/feature-flags')
      .send({ key: 'valid', defaultValue: false, secret: true });
    const emptyPatch = await request(app).patch('/api/feature-flags/valid').send({});
    const malformedRule = await request(app)
      .post('/api/feature-flags')
      .send({
        key: 'valid',
        defaultValue: false,
        rules: [{ attribute: 'plan', operator: 'in', comparisonValue: 'pro', value: true }],
      });

    expect(invalidKey.status).toBe(400);
    expect(unknownField.status).toBe(400);
    expect(emptyPatch.status).toBe(400);
    expect(malformedRule.status).toBe(400);
  });

  it('returns conflict for duplicate creation and not found for missing mutations', async () => {
    const app = makeApp(admin);
    await request(app).post('/api/feature-flags').send({ key: 'existing', defaultValue: false });

    expect(
      (await request(app).post('/api/feature-flags').send({ key: 'existing', defaultValue: true }))
        .status
    ).toBe(409);
    expect(
      (await request(app).patch('/api/feature-flags/missing').send({ enabled: false })).status
    ).toBe(404);
    expect((await request(app).delete('/api/feature-flags/missing')).status).toBe(404);
  });
});
