import { describe, expect, it, vi } from 'vitest'
import { createProductRepository } from '../src/repositories/productRepository.js'

describe('product repository', () => {
  it('keeps search values out of SQL and uses placeholders', async () => {
    const dbQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
    const repository = createProductRepository(dbQuery)
    const hostileSearch = "flor%' OR TRUE; DROP TABLE app.produtos; --"

    await repository.list({ q: hostileSearch, category: 'brincos', collection: undefined, sort: 'price_asc', page: 2, limit: 12 })

    expect(dbQuery).toHaveBeenCalledTimes(2)
    const countCall = dbQuery.mock.calls[0][0]
    const listCall = dbQuery.mock.calls[1][0]
    expect(countCall.text).not.toContain(hostileSearch)
    expect(listCall.text).not.toContain(hostileSearch)
    expect(countCall.values).toEqual([`%${hostileSearch}%`, 'brincos'])
    expect(listCall.values).toEqual([`%${hostileSearch}%`, 'brincos', 12, 12])
    expect(listCall.text).toContain('ORDER BY menor_preco ASC, p.id ASC')
  })

  it('uses a parameterized slug in every product-detail query', async () => {
    const dbQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 42, nome: 'Floral' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
    const repository = createProductRepository(dbQuery)

    await repository.findBySlug('brinco-floral')

    expect(dbQuery).toHaveBeenCalledTimes(4)
    expect(dbQuery.mock.calls[0][0].values).toEqual(['brinco-floral'])
    for (const call of dbQuery.mock.calls.slice(1)) expect(call[0].values).toEqual([42])
  })
})
