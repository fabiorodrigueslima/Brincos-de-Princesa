import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

function catalogProduction() {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('SITE_MODE', 'catalog');
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
  vi.stubEnv('PUBLIC_FRONTEND_URL', 'https://shop.example.com');
  vi.stubEnv('PUBLIC_BACKEND_URL', 'https://shop.example.com');
  vi.stubEnv('FRONTEND_ORIGINS', 'https://shop.example.com');
}

describe('catalog-only publication', () => {
  it('boots production without commerce credentials and disables provider transports', async () => {
    catalogProduction();
    vi.stubEnv('PAYMENT_PROVIDER', 'mercado-pago');
    vi.stubEnv('EMAIL_PROVIDER', 'http');
    const { env } = await import('../src/config/env.js');
    for (const field of ['PAYMENT_PROVIDER', 'SHIPPING_PROVIDER', 'EMAIL_PROVIDER', 'STORAGE_PROVIDER']) expect(env[field]).toBe('disabled');
  });

  it('keeps HTTPS and database requirements in catalog production', async () => {
    catalogProduction();
    vi.stubEnv('FRONTEND_ORIGINS', 'http://localhost:5173');
    await expect(import('../src/config/env.js')).rejects.toThrow(/FRONTEND_ORIGINS/);
    vi.resetModules();
    vi.stubEnv('FRONTEND_ORIGINS', 'https://shop.example.com');
    vi.stubEnv('DATABASE_URL', '');
    await expect(import('../src/config/env.js')).rejects.toThrow(/DATABASE_URL/);
  });

  it('rejects direct commerce, account, webhook and job requests before database access', async () => {
    vi.stubEnv('SITE_MODE', 'catalog');
    const { app } = await import('../src/app.js');
    for (const route of ['/api/v1/orders', '/api/v1/orders/ABC/payments', '/api/v1/checkout/quote', '/api/v1/customers/auth/register', '/api/v1/webhooks/payments/mercado-pago', '/api/internal/jobs/send-emails']) {
      const response = await request(app).post(route).send({});
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('CATALOG_ONLY');
    }
    expect((await request(app).get('/api/v1/storefront')).body.data.mode).toBe('catalog');
    expect((await request(app).get('/api/v1/admin/auth/me')).status).toBe(401);
  });
});
