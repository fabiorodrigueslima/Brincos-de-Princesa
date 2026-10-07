import { spawnSync } from 'node:child_process';
import { it,expect } from 'vitest';
it('runs a production HTTP checkout with isolated PostgreSQL and mocked external providers',()=>{
  const result=spawnSync(process.execPath,['tests/helpers/production-smoke.js'],{
    cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:60000,
    env:{...process.env,NODE_ENV:'production',DATABASE_URL:process.env.TEST_DATABASE_URL,
      PUBLIC_FRONTEND_URL:'https://shop.example.com',PUBLIC_BACKEND_URL:'https://shop.example.com',FRONTEND_ORIGINS:'https://shop.example.com',
      PAYMENT_PROVIDER:'mercado-pago',MERCADO_PAGO_ACCESS_TOKEN:'synthetic-test-only',MERCADO_PAGO_WEBHOOK_SECRET:'synthetic-test-secret-not-real',
      SHIPPING_PROVIDER:'superfrete',SUPERFRETE_API_BASE_URL:'https://api.superfrete.com/api/v0',SUPERFRETE_TOKEN:'synthetic-test-only',SUPERFRETE_ORIGIN_CEP:'01001000',
      STORAGE_PROVIDER:'cloudinary',CLOUDINARY_CLOUD_NAME:'test',CLOUDINARY_API_KEY:'synthetic',CLOUDINARY_API_SECRET:'synthetic',
      EMAIL_PROVIDER:'http',EMAIL_WEBHOOK_URL:'https://mail.example.com',EMAIL_WEBHOOK_TOKEN:'synthetic',
      CRON_SECRET:'synthetic-cron-test-only-12345678901234567890',RATE_LIMIT_STORE:'postgres',DB_SSL:'false',TRUST_PROXY:'0',VERCEL:''},
  });
  expect(result.error?.message??result.stderr).toBe('');
  expect(result.status,result.stdout).toBe(0);
  expect(result.stdout).toContain('PRODUCTION_SMOKE_PASSED');
},65000);
