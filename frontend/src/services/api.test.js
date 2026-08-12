import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createOrder, getCollection, getCourse, getCourses, getOrder, getProducts } from './api.js'

afterEach(() => vi.unstubAllGlobals())

describe('catalog API client', () => {
  it('serializes combined commercial filters', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [], pagination: {} }) })
    vi.stubGlobal('fetch', fetchMock)
    await getProducts({ q: 'azul', category: 'brincos', collection: 'demo', promotions: true, sort: 'price_asc', page: 2, limit: 12 })
    const url = fetchMock.mock.calls[0][0]
    for (const part of ['q=azul','category=brincos','collection=demo','promotions=true']) expect(url).toContain(part)
  })

  it('returns collection data on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { slug: 'demo' } }) }))
    await expect(getCollection('demo')).resolves.toMatchObject({ data: { slug: 'demo' } })
  })

  it('maps a collection 404 to a controlled ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: { message: 'Coleção não encontrada.', code: 'COLLECTION_NOT_FOUND' } }) }))
    await expect(getCollection('inexistente')).rejects.toMatchObject({ name: 'ApiError', status: 404, code: 'COLLECTION_NOT_FOUND' })
  })

  it('uses a safe error when the response has no JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => { throw new Error('invalid') } }))
    await expect(getProducts({ page: 1 })).rejects.toEqual(expect.any(ApiError))
  })

  it('loads course listing and detail through public endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok:true,json:async()=>({data:[]}) })
    vi.stubGlobal('fetch',fetchMock)
    await getCourses({page:1,limit:12}); await getCourse('dados-demonstracao')
    expect(fetchMock.mock.calls[0][0]).toContain('/courses?page=1&limit=12')
    expect(fetchMock.mock.calls[1][0]).toContain('/courses/dados-demonstracao')
  })

  it('sends order credentials only in dedicated headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
    vi.stubGlobal('fetch', fetchMock)
    await createOrder({ items: [] }, 'idempotency-123456'); await getOrder('BP-1234567890ABCDEF', 'secret-token')
    expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe('idempotency-123456')
    expect(fetchMock.mock.calls[1][0]).not.toContain('secret-token')
    expect(fetchMock.mock.calls[1][1].headers['X-Order-Token']).toBe('secret-token')
  })
})
