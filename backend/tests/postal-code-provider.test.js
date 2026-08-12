import { describe, expect, it, vi } from 'vitest'
import { createPostalCodeProvider } from '../src/providers/postalCodeProvider.js'

describe('postal code provider adapter', () => {
  it('normalizes the provider response to public address fields', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ street: 'Rua A', neighborhood: 'Centro', city: 'Brasília', state: 'DF' }) }))
    await expect(createPostalCodeProvider({ fetchImpl, baseUrl: 'https://provider.test', timeoutMs: 10 }).lookup('72000000')).resolves.toEqual({ postalCode: '72000000', street: 'Rua A', neighborhood: 'Centro', city: 'Brasília', state: 'DF' })
    expect(fetchImpl).toHaveBeenCalledWith('https://provider.test/72000000', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('maps not found and provider failures to controlled errors', async () => {
    await expect(createPostalCodeProvider({ fetchImpl: async () => ({ ok: false, status: 404 }) }).lookup('72000000')).rejects.toMatchObject({ code: 'POSTAL_CODE_NOT_FOUND', status: 404 })
    await expect(createPostalCodeProvider({ fetchImpl: async () => { throw new Error('secret response') } }).lookup('72000000')).rejects.toMatchObject({ code: 'POSTAL_CODE_PROVIDER_UNAVAILABLE', status: 503 })
  })
})
