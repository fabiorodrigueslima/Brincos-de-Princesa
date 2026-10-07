import fs from 'node:fs/promises';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(import.meta.dirname, '..');
const configPath = process.argv[2] || 'C:/backup-brinco/20261007_010534/neon-runtime.env';
const runtime = parseEnv(await fs.readFile(configPath, 'utf8'));
const url = new URL(runtime.DATABASE_URL);
if (url.hostname !== 'ep-bitter-frost-b6mmbjes-pooler.c-2.sa-east-1.aws.neon.tech' || url.pathname !== '/neondb' || decodeURIComponent(url.username) !== 'brinco_app') {
  throw new Error('Destino da prévia não corresponde ao banco Neon autorizado.');
}
url.searchParams.set('sslmode', 'verify-full');
url.searchParams.delete('uselibpqcompat');
delete process.env.DATABASE_ADMIN_URL;
delete process.env.TEST_DATABASE_ADMIN_URL;
delete process.env.VERCEL;
Object.assign(process.env, {
  NODE_ENV: 'development', SITE_MODE: 'catalog', DATABASE_URL: url.href, DB_SSL: 'true',
  DB_POOL_MAX: '3', DB_CONNECTION_TIMEOUT_MS: '10000',
  FRONTEND_ORIGINS: 'http://127.0.0.1:5174', TRUST_PROXY: '0',
  PUBLIC_FRONTEND_URL: 'http://127.0.0.1:5174', PUBLIC_BACKEND_URL: 'http://127.0.0.1:5174',
  PAYMENT_PROVIDER: 'disabled', SHIPPING_PROVIDER: 'disabled',
  EMAIL_PROVIDER: 'disabled', STORAGE_PROVIDER: 'disabled', RATE_LIMIT_STORE: 'memory',
  VITE_API_BASE_URL: '/api/v1',
});
const { app } = await import('../backend/src/app.js');
const { checkDatabase, closeDatabase } = await import('../backend/src/config/database.js');
if (!await checkDatabase()) { await closeDatabase(); throw new Error('Não foi possível conectar ao Neon.'); }
const api = app.listen(3001, '127.0.0.1');
await new Promise((resolve, reject) => { api.once('listening', resolve); api.once('error', reject); });
const frontend = await createServer({
  root: path.join(root, 'frontend'), configFile: false, envDir: false,
  plugins: [react()], server: { host: '127.0.0.1', port: 5174, strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3001' } },
});
await frontend.listen();
console.log('Prévia conectada ao Neon: http://127.0.0.1:5174/admin');
console.log('Pagamentos, envios de e-mail e integrações de frete/imagens desativados nesta prévia.');
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await frontend.close();
  await new Promise(resolve => api.close(resolve));
  await closeDatabase();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
