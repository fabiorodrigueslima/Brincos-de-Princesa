import { env } from '../config/env.js';

export function catalogMode(_req, res, next) {
  if (env.SITE_MODE !== 'catalog') return next();
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({ error: { code: 'CATALOG_ONLY', message: 'As compras online estarão disponíveis em breve. Por enquanto, conheça nosso catálogo.' } });
}
