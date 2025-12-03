import cors from 'cors';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

describe('CORS configuration', () => {
  it('allows configured origins and blocks others', async () => {
    const app = express();
    app.use(
      cors({
        origin: ['http://localhost:3000', 'https://trusted-domain.com'],
      })
    );

    app.get('/api/health', (_req, res) => res.json({ ok: true }));

    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBeDefined();

    const trusted = await request(app)
      .get('/api/health')
      .set('Origin', 'https://trusted-domain.com');
    expect(trusted.headers['access-control-allow-origin']).toBeDefined();

    const blocked = await request(app).get('/api/health').set('Origin', 'https://malicious.com');
    // For blocked origins, CORS middleware will not echo Access-Control-Allow-Origin
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});
