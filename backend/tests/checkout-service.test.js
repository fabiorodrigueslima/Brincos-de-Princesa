import { describe, expect, it } from 'vitest'
import { createCheckoutService } from '../src/services/checkoutService.js'

const item = { variantId: 1, quantity: 2, available: true, unitPrice: '49.90', subtotal: '99.80', productName: 'Peça', variantName: 'Única', weightGrams: 8 }
const cart = { validate: async () => ({ items: [item], subtotal: '99.80' }) }

describe('authoritative checkout quote', () => {
  it('calculates shipping and total in integer cents', async () => {
    const service = createCheckoutService({ cart, shipping: { quote: async () => [{ id: 'eco', service: 'Econômica', carrier: 'Transportadora', price: '12.35', estimatedDays: 5 }] } })
    const result = await service.quote({ items: [{ variantId: 1, quantity: 2 }], address: { postalCode: '72000000' }, shippingOptionId: 'eco' })
    expect(result).toMatchObject({ subtotal: '99.80', shipping: '12.35', total: '112.15', selectedShipping: { id: 'eco' } })
  })

  it('returns only real provider options before selection', async () => {
    const service = createCheckoutService({ cart, shipping: { quote: async () => [{ id: 7, service: 'Expressa', price: 20 }] } })
    const result = await service.quote({ items: [], address: { postalCode: '72000000' } })
    expect(result).toMatchObject({ shipping: null, total: null, shippingOptions: [{ id: '7', price: '20.00' }] })
  })

  it('blocks review when stock or availability changed', async () => {
    const service = createCheckoutService({ cart: { validate: async () => ({ items: [{ ...item, available: false, reason: 'INSUFFICIENT_STOCK' }], subtotal: '99.80' }) }, shipping: { quote: async () => [] } })
    await expect(service.quote({ items: [], address: {} })).rejects.toMatchObject({ status: 409, code: 'CART_CHANGED' })
  })

  it('rejects a shipping option not returned by the provider', async () => {
    const service = createCheckoutService({ cart, shipping: { quote: async () => [{ id: 'real', service: 'Real', price: 10 }] } })
    await expect(service.quote({ items: [], address: { postalCode: '72000000' }, shippingOptionId: 'forged' })).rejects.toMatchObject({ code: 'SHIPPING_OPTION_INVALID' })
  })
})
