import { describe, expect, it, vi } from 'vitest'
import { createSettingsRepository } from '../src/repositories/settingsRepository.js'
import { createCheckoutAvailabilityService } from '../src/services/checkoutAvailabilityService.js'
import { createOrderService } from '../src/services/orderService.js'
import { createOrderRepository } from '../src/repositories/orderRepository.js'

describe('A06 checkout availability', () => {
  it.each([false, null, 'true', 1, undefined])('fails closed for configuration %s', async value => {
    const repository = createSettingsRepository(async () => ({ rows: value === undefined ? [] : [{ valor: value }] }))
    await expect(createCheckoutAvailabilityService(repository).assertEnabled()).rejects.toMatchObject({ status: 503, code: 'CHECKOUT_DISABLED' })
  })
  it('blocks before quote, repository writes or external calls, and allows reactivation', async () => {
    let enabled = false
    const availability = createCheckoutAvailabilityService({ isCheckoutEnabled: async () => enabled })
    const checkout = { quote: vi.fn(async () => ({ selectedShipping: { id: 'fixed' }, total: '100.00' })) }
    const repository = { create: vi.fn(async () => ({ code: 'created' })) }
    const service = createOrderService({ availability, checkout, repository })
    await expect(service.create({}, 'idempotency-key-1234')).rejects.toMatchObject({ code: 'CHECKOUT_DISABLED' })
    expect(checkout.quote).not.toHaveBeenCalled()
    expect(repository.create).not.toHaveBeenCalled()
    enabled = true
    await expect(service.create({}, 'idempotency-key-1234')).resolves.toEqual({ code: 'created' })
    expect(checkout.quote).toHaveBeenCalledOnce()
    expect(repository.create).toHaveBeenCalledOnce()
  })
  it('rechecks under a shared lock before the first persistent statement', async () => {
    const query = vi.fn(async () => ({ rows: [{ valor: false }] }))
    await expect(createOrderRepository(work => work({ query })).create({})).rejects.toMatchObject({ code: 'CHECKOUT_DISABLED' })
    expect(query).toHaveBeenCalledOnce()
    expect(query.mock.calls[0][0]).toEqual({ text: 'SELECT valor FROM app.configuracoes WHERE chave=$1 FOR SHARE', values: ['checkout.enabled'] })
  })
})
