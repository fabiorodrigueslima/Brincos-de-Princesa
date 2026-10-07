import fs from 'node:fs/promises';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { context,privateFolder,run } from './neon-context.mjs';

const {url}=await context();
const runtime=parseEnv(await fs.readFile(path.join(privateFolder,'neon-runtime.env'),'utf8'));
const pooled=new URL(runtime.DATABASE_URL);pooled.pathname='/bdp_neon_smoke_20261007';url.pathname=pooled.pathname;
const env={...process.env,...runtime,NODE_ENV:'production',DATABASE_URL:pooled.href,SMOKE_DATABASE_ADMIN_URL:url.href,
  PUBLIC_FRONTEND_URL:'https://shop.example.com',PUBLIC_BACKEND_URL:'https://shop.example.com',FRONTEND_ORIGINS:'https://shop.example.com',
  PAYMENT_PROVIDER:'mercado-pago',MERCADO_PAGO_ACCESS_TOKEN:'synthetic-test-only',MERCADO_PAGO_WEBHOOK_SECRET:'synthetic-test-secret-not-real',
  SHIPPING_PROVIDER:'superfrete',SUPERFRETE_API_BASE_URL:'https://api.superfrete.com/api/v0',SUPERFRETE_TOKEN:'synthetic-test-only',SUPERFRETE_ORIGIN_CEP:'01001000',
  STORAGE_PROVIDER:'cloudinary',CLOUDINARY_CLOUD_NAME:'test',CLOUDINARY_API_KEY:'synthetic',CLOUDINARY_API_SECRET:'synthetic',
  EMAIL_PROVIDER:'http',EMAIL_WEBHOOK_URL:'https://mail.example.com',EMAIL_WEBHOOK_TOKEN:'synthetic',
  CRON_SECRET:'synthetic-cron-test-only-12345678901234567890',RATE_LIMIT_STORE:'postgres',TRUST_PROXY:'0',VERCEL:''};
try{
  const result=await run(process.execPath,['backend/tests/helpers/neon-smoke.js'],env);
  await fs.writeFile(path.join(privateFolder,'neon-http-smoke.log'),result.output+result.errors);
  if(!result.output.includes('NEON_PRODUCTION_SMOKE_PASSED'))throw Error('SMOKE_NOT_COMPLETED');
  console.log(result.output);
}catch(error){console.error({error:error.message,diagnostic:error.diagnostic});process.exitCode=1;}
