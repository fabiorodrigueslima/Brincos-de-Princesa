const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request(path, { signal } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(payload?.error?.message ?? 'Não foi possível acessar o catálogo.', response.status, payload?.error?.code)
  }
  return payload
}

export function getCategories(signal) {
  return request('/catalog/categories', { signal })
}

export function getProducts(filters, signal) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== undefined) params.set(key, value)
  }
  return request(`/products?${params}`, { signal })
}

export function getProduct(slug, signal) {
  return request(`/products/${encodeURIComponent(slug)}`, { signal })
}
