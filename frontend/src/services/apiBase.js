export function resolveApiBase(value, production = false) {
  const base = (value ?? '/api/v1').trim().replace(/\/$/, '');
  if (base.startsWith('/') && !base.startsWith('//') && !base.includes('\\')) return base;
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash ||
      !['http:', 'https:'].includes(url.protocol) ||
      (production && (url.protocol !== 'https:' || /^(localhost|127\.|\[::1\])/.test(url.hostname)))) {
    throw new Error('VITE_API_BASE_URL inválida para este ambiente.');
  }
  return base;
}
