import assert from 'node:assert/strict';
import { preview } from 'vite';
import { fileURLToPath } from 'node:url';

const server = await preview({ root: fileURLToPath(new URL('../frontend', import.meta.url)), preview: { host: '127.0.0.1', port: 0, open: false } });
try {
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const route of ['/', '/produto/exemplo', '/pedido/BP-test', '/checkout', '/minha-conta', '/admin']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.match(html, /id="root"/, route);
    const asset = html.match(/src="(\/assets\/[^" ]+\.js)"/);
    assert(asset, 'Production JavaScript asset');
    assert.equal((await fetch(base + asset[1])).status, 200);
  }
  console.log('SPA production preview: 6 deep links and compiled assets passed. Vercel edge routing still requires deployment verification.');
} finally { await new Promise(resolve => server.httpServer.close(resolve)); }
