import { describe, expect, it, vi } from 'vitest'
import { createPaymentService } from '../src/services/paymentService.js'

describe('payment provider boundary', () => {
  it('uses the persisted order total rather than a browser amount', async () => {
    const provider = { name: 'sandbox', createPayment: vi.fn(async () => ({ id: 'pay-1' })) }
    const repository = { create: vi.fn(async (value) => value) }
    const service = createPaymentService({ provider, repository, orders: { get: async () => ({ status: 'PENDING_PAYMENT', total: '120.50' }) } })
    await service.create({ code: 'BP-X', token: 'token', method: 'PIX', idempotencyKey: '1234567890abcdef', amount: '0.01' })
    expect(provider.createPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: '120.50' }))
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ amount: '120.50' }))
  })
  it('does not accept an unknown webhook provider', async () => {
    const service = createPaymentService({ provider: { name: 'official' }, repository: {} })
    await expect(service.webhook({ providerName: 'forged', payload: { status: 'paid' } })).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_NOT_FOUND' })
  })
  it('processes only the normalized event returned after provider verification', async () => {
    const repository = { processWebhook: vi.fn(async () => ({ approved: true })) }
    const provider = { name: 'official', verifyWebhook: vi.fn(async () => ({ eventId: 'evt-1', paymentId: 'pay-1', type: 'payment', status: 'APPROVED' })) }
    await createPaymentService({ provider, repository }).webhook({ providerName: 'official', signature: 'valid', payload: { opaque: true } })
    expect(provider.verifyWebhook).toHaveBeenCalled()
    expect(repository.processWebhook).toHaveBeenCalledWith(expect.objectContaining({ status: 'APPROVED', payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/) }))
  })
})
