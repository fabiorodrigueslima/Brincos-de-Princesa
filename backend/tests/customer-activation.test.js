import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'
import { createCustomerAuthService, customerAuthService } from '../src/services/customerAuthService.js'
import { createHttpEmailProvider } from '../src/providers/emailProvider.js'

afterEach(() => vi.restoreAllMocks())

describe('A05 account activation', () => {
  it('rejects registration equally for existing accounts with and without passwords', async () => {
    for (const password_hash of [null, 'hash']) {
      const repository = { findByEmail: async () => ({ id: 1, password_hash }), create: vi.fn(), createSession: vi.fn() }
      await expect(createCustomerAuthService(repository).register({ email: 'old@example.com', password: 'a secure password' })).rejects.toMatchObject({ status: 409, code: 'ACCOUNT_EXISTS' })
      expect(repository.create).not.toHaveBeenCalled()
      expect(repository.createSession).not.toHaveBeenCalled()
    }
  })
  it('sends only a hashed, purpose-specific token and never returns a session or token', async () => {
    const repository = { findByEmail: async () => ({ id: 1, email: 'old@example.com', ativo: true, password_hash: null }), createActivation: vi.fn(async () => true), createSession: vi.fn() }
    const email = { sendAccountActivation: vi.fn(), sendPasswordReset: vi.fn() }
    const service = createCustomerAuthService(repository, email)
    expect(await service.requestActivation('old@example.com')).toEqual({ accepted: true })
    const url = new URL(email.sendAccountActivation.mock.calls[0][0].activationUrl)
    expect(url.pathname).toBe('/ativar-conta')
    expect(url.searchParams.get('token')).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(repository.createActivation).toHaveBeenCalledWith(1, service.hash(url.searchParams.get('token')))
    expect(email.sendPasswordReset).not.toHaveBeenCalled()
    expect(repository.createSession).not.toHaveBeenCalled()
  })
  it.each([null, { ativo: true, password_hash: 'hash' }, { ativo: false }, { ativo: true, anonimizado_em: new Date() }])('gives the same accepted response for an ineligible account %#', async customer => {
    const repository = { findByEmail: async () => customer, createActivation: vi.fn() }
    expect(await createCustomerAuthService(repository).requestActivation('unknown@example.com')).toEqual({ accepted: true })
    expect(repository.createActivation).not.toHaveBeenCalled()
  })
  it('does not reveal account eligibility when email delivery fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const repository = { findByEmail: async () => ({ id: 1, ativo: true, email: 'old@example.com' }), createActivation: async () => true }
    const email = { sendAccountActivation: async () => { throw new Error('private provider detail') } }
    expect(await createCustomerAuthService(repository, email).requestActivation('old@example.com')).toEqual({ accepted: true })
    expect(console.error).toHaveBeenCalledWith(JSON.stringify({ event: 'CUSTOMER_ACTIVATION_REQUEST_FAILED' }))
  })
  it('uses a separate email template and keeps password reset intact', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }))
    const provider = createHttpEmailProvider({ fetchImpl, config: { EMAIL_WEBHOOK_URL: 'https://example.invalid', EMAIL_WEBHOOK_TOKEN: 'synthetic', EXTERNAL_REQUEST_TIMEOUT_MS: 1000 } })
    await provider.sendAccountActivation({ email: 'test@example.com', activationUrl: 'https://example.invalid/ativar-conta?token=synthetic' })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ template: 'account-activation', variables: { activationUrl: expect.any(String) } })
    await provider.sendPasswordReset({ email: 'test@example.com', resetUrl: 'https://example.invalid/reset' })
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toMatchObject({ template: 'password-reset', variables: { resetUrl: expect.any(String) } })
  })
  it('validates activation input before service access', async () => {
    const activate = vi.spyOn(customerAuthService, 'activate')
    expect((await request(app).post('/api/v1/customers/auth/activation/confirm').send({ token: 'short', password: 'weak' })).status).toBe(400)
    expect(activate).not.toHaveBeenCalled()
  })
  it('requires a fresh login after activation and clears rather than issues a session cookie', async () => {
    vi.spyOn(customerAuthService, 'activate').mockResolvedValue({ activated: true })
    const response = await request(app).post('/api/v1/customers/auth/activation/confirm').send({ token: 'a'.repeat(43), password: 'a strong password 123' })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { activated: true } })
    expect(response.headers['set-cookie'][0]).toContain('bdp_customer=;')
    expect(response.headers['cache-control']).toContain('no-store')
  })
})
