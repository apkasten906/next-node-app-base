import express from 'express';
import request from 'supertest';
import { describe, it } from 'vitest';
import { z } from 'zod';

describe('Input Validation Integration', () => {
  it('rejects XSS and SQLi-like payloads', async () => {
    const app = express();
    app.use(express.json());

    // Simple Zod schema for payload validation
    const bodySchema = z.object({
      username: z.string().min(3).max(50),
      comment: z.string().max(1000),
    });

    app.post('/api/comments', (req, res) => {
      const parse = bodySchema.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ error: 'Validation failed' });
        return;
      }

      const { comment } = parse.data;

      // Very small sanitization check for test purposes
      const hasXSS = /<script\b[^>]*>([\s\S]*?)<\/script>/i.test(comment);
      const hasSQLi = /(;|--|\bDROP\b|\bSELECT\b)/i.test(comment);

      if (hasXSS || hasSQLi) {
        res.status(400).json({ error: 'Malicious input detected' });
        return;
      }

      res.status(201).json({ ok: true });
    });

    // XSS payload
    await request(app)
      .post('/api/comments')
      .send({ username: 'alice', comment: "<script>alert('xss')</script>" })
      .expect(400);

    // SQLi payload
    await request(app)
      .post('/api/comments')
      .send({ username: 'alice', comment: "'; DROP TABLE users; --" })
      .expect(400);

    // Valid payload
    await request(app)
      .post('/api/comments')
      .send({ username: 'alice', comment: 'Nice post!' })
      .expect(201);
  });
});
