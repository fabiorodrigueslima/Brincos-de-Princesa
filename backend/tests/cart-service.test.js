import { describe, expect, it } from 'vitest'
import { createCartService } from '../src/services/cartService.js'

const row = {
  variante_id: 10, produto_id: 2, produto_slug: 'floral', produto_nome: 'Brinco Floral',
  variante_nome: 'Rosa', sku: 'FLOR-ROSA', ativa: true, produto_status: 'ACTIVE',
  preco: '49.90', preco_promocional: null, estoque_disponivel: 3,
  imagem_url: '/floral.webp', imagem_alt: 'Brinco floral rosa',
}

const serviceFor = (rows = [row]) => createCartService({ findVariantsByIds: async () => rows })

describe('cart server-side validation', () => {
  it('rebuilds prices and ignores a forged client price', async () => {
    const result = await serviceFor().validate([{ variantId: 10, quantity: 2, price: 0.01 }])
    expect(result).toMatchObject({ subtotal: '99.80', items: [{ unitPrice: '49.90', subtotal: '99.80', available: true }] })
  })

  it('reports insufficient and zero stock', async () => {
    expect((await serviceFor().validate([{ variantId: 10, quantity: 5 }])).items[0].reason).toBe('INSUFFICIENT_STOCK')
    expect((await serviceFor([{ ...row, estoque_disponivel: 0 }]).validate([{ variantId: 10, quantity: 1 }])).items[0].reason).toBe('OUT_OF_STOCK')
  })

  it('reports missing, inactive variant and inactive product without throwing', async () => {
    expect((await serviceFor([]).validate([{ variantId: 999, quantity: 1 }])).items[0].reason).toBe('VARIANT_NOT_FOUND')
    expect((await serviceFor([{ ...row, ativa: false }]).validate([{ variantId: 10, quantity: 1 }])).items[0].reason).toBe('INACTIVE')
    expect((await serviceFor([{ ...row, produto_status: 'ARCHIVED' }]).validate([{ variantId: 10, quantity: 1 }])).items[0].reason).toBe('INACTIVE')
  })

  it('calculates multiple products in integer cents', async () => {
    const second = { ...row, variante_id: 11, preco: '10.05', estoque_disponivel: 9 }
    const result = await serviceFor([row, second]).validate([{ variantId: 10, quantity: 1 }, { variantId: 11, quantity: 3 }])
    expect(result.subtotal).toBe('80.05')
  })
})
