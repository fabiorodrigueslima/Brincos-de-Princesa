import { describe, expect, it, vi } from 'vitest'
import { createOrderService } from '../src/services/orderService.js'

const input = { items: [{ variantId: 1, quantity: 1 }], customer: { name: 'Maria', email: 'maria@example.com', phone: '61999999999' }, address: { postalCode: '72000000' }, shippingOptionId: 'real' }

describe('order service boundary', () => {
  it('requires a strong idempotency key before creating anything', async () => {
    const repository = { create: vi.fn() }
    await expect(createOrderService({ checkout: { quote: vi.fn() }, repository }).create(input, 'short')).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' })
    expect(repository.create).not.toHaveBeenCalled()
  })
  it('requires a selected final real quote', async () => {
    await expect(createOrderService({ checkout: { quote: async () => ({ selectedShipping: null, total: null }) }, repository: { create: vi.fn() } }).create(input, '1234567890abcdef')).rejects.toMatchObject({ code: 'FINAL_QUOTE_REQUIRED' })
  })
  it('passes only authoritative quote and hashed credentials to the repository', async () => {
    const repository = { create: vi.fn(async (value) => value) }
    const quote = { selectedShipping: { id: 'real' }, total: '110.00', shipping: '10.00', subtotal: '100.00', items: [] }
    const result = await createOrderService({ checkout: { quote: async () => quote }, repository }).create(input, '1234567890abcdef')
    expect(result).toMatchObject({ quote, keyHash: expect.stringMatching(/^[a-f0-9]{64}$/), accessTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), publicCode: expect.stringMatching(/^BP-[A-F0-9]{16}$/) })
  })
  it('protects public lookup with an access token', async () => {
    await expect(createOrderService({ repository: {} }).get('BP-1234567890ABCDEF', '')).rejects.toMatchObject({ code: 'ORDER_TOKEN_REQUIRED' })
  })
})
