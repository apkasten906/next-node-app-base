import express, { Express } from 'express';
import helmet from 'helmet';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Integration test for OWASP Top 10 protection with Helmet.js
 * Covers @security @owasp scenario from 02-security.feature
 */
describe('OWASP Top 10 Protection with Helmet.js', () => {
  let app: Express;

  beforeEach(() => {
    app = express();

    // Configure Helmet.js with standard security headers
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        hsts: {
          maxAge: 31536000, // 1 year in seconds
          includeSubDomains: true,
          preload: true,
        },
      })
    );

    // Test route
    app.get('/api/test', (_req, res) => {
      res.json({ message: 'test' });
    });
  });

  it('should include X-Content-Type-Options header', async () => {
    const res = await request(app).get('/api/test').expect(200);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should include X-Frame-Options header', async () => {
    const res = await request(app).get('/api/test').expect(200);

    expect(res.headers['x-frame-options']).toBeDefined();
    // Helmet sets this to SAMEORIGIN by default
    expect(['DENY', 'SAMEORIGIN']).toContain(res.headers['x-frame-options']);
  });

  it('should include X-XSS-Protection header', async () => {
    const res = await request(app).get('/api/test').expect(200);

    // Note: Modern Helmet may set this to '0' as it's deprecated in favor of CSP
    expect(res.headers['x-xss-protection']).toBeDefined();
  });

  it('should include Strict-Transport-Security header', async () => {
    const res = await request(app).get('/api/test').expect(200);

    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['strict-transport-security']).toContain('includeSubDomains');
  });

  it('should include Content-Security-Policy header', async () => {
    const res = await request(app).get('/api/test').expect(200);

    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('should include all required security headers together', async () => {
    const res = await request(app).get('/api/test').expect(200);

    expect(res.headers['x-content-type-options']).toBeDefined();
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('should prevent clickjacking with X-Frame-Options', async () => {
    const res = await request(app).get('/api/test').expect(200);

    // X-Frame-Options should prevent embedding in iframes
    const xFrameOptions = res.headers['x-frame-options'];
    expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions);
  });

  it('should prevent MIME type sniffing with X-Content-Type-Options', async () => {
    const res = await request(app).get('/api/test').expect(200);

    // nosniff prevents browsers from MIME-sniffing
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should enforce HTTPS with Strict-Transport-Security', async () => {
    const res = await request(app).get('/api/test').expect(200);

    const hsts = res.headers['strict-transport-security'];
    expect(hsts).toBeDefined();

    // Should have max-age of at least 1 year (31536000 seconds)
    const maxAgeMatch = hsts.match(/max-age=(\d+)/);
    expect(maxAgeMatch).toBeTruthy();

    if (maxAgeMatch) {
      const maxAge = Number.parseInt(maxAgeMatch[1], 10);
      expect(maxAge).toBeGreaterThanOrEqual(31536000);
    }
  });

  it('should set Content-Security-Policy to mitigate XSS attacks', async () => {
    const res = await request(app).get('/api/test').expect(200);

    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();

    // Should restrict default sources to self
    expect(csp).toContain("default-src 'self'");
  });

  it('should include X-DNS-Prefetch-Control header', async () => {
    const res = await request(app).get('/api/test').expect(200);

    // Helmet includes this by default
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });

  it('should remove X-Powered-By header to prevent information disclosure', async () => {
    const res = await request(app).get('/api/test').expect(200);

    // Helmet removes the X-Powered-By header by default
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
