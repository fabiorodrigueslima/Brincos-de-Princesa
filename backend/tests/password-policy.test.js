import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'
import { adminLoginSchema } from '../src/validators/adminValidators.js'
import { customerRegisterSchema, customerLoginSchema, customerActivationSchema, customerResetSchema, customerPasswordSchema } from '../src/validators/customerValidators.js'
import { createCustomerAuthService, customerAuthService } from '../src/services/customerAuthService.js'
import { adminAuthService } from '../src/services/adminAuthService.js'
import { hashPassword, verifyPassword } from '../src/security/password.js'

const email = 'password-test@example.com'
const token = 'a'.repeat(43)
const registration = { name: 'Maria', email, phone: '11999999999' }
const flows = [
  ['register', customerRegisterSchema, password => ({ ...registration, password })],
  ['login', customerLoginSchema, password => ({ email, password })],
  ['activation', customerActivationSchema, password => ({ token, password })],
  ['reset', customerResetSchema, password => ({ token, password })],
  ['change password', customerPasswordSchema, newPassword => ({ currentPassword: 'previous-password', newPassword })],
  ['current password', customerPasswordSchema, currentPassword => ({ currentPassword, newPassword: 'next-password' })],
  ['admin login', adminLoginSchema, password => ({ email, password })],
]

afterEach(() => vi.restoreAllMocks())

describe.each(flows)('%s password validation', (_name, schema, payload) => {
  it('rejects seven characters with the Portuguese minimum-length message', () => {
    const result = schema.safeParse(payload('a'.repeat(7)))
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('A senha deve ter no mínimo 8 caracteres.')
  })
  it.each([8, 9, 200])('accepts %i characters without changing the password', length => {
    const value = payload('a'.repeat(length))
    expect(schema.parse(value)).toEqual(value)
  })
  it('preserves the existing 200-character maximum', () => {
    expect(schema.safeParse(payload('a'.repeat(201))).success).toBe(false)
  })
})

describe('password API compatibility', () => {
  const session = { token: 'session', csrf: 'csrf', user: { id: 1 } }
  it.each([
    ['register', 'register', customerRegisterSchema, password => ({ ...registration, password }), 201, session],
    ['login', 'login', customerLoginSchema, password => ({ email, password }), 200, session],
    ['activation/confirm', 'activate', customerActivationSchema, password => ({ token, password }), 200, { activated: true }],
    ['reset', 'reset', customerResetSchema, password => ({ token, password }), 200, { reset: true }],
  ])('accepts eight and nine characters at /auth/%s', async (path, method, _schema, payload, status, result) => {
    const service = vi.spyOn(customerAuthService, method).mockResolvedValue(result)
    for (const password of ['abcdefgh', 'abcdefghi']) {
      const response = await request(app).post(`/api/v1/customers/auth/${path}`).send(payload(password))
      expect(response.status).toBe(status)
      if (method === 'activate' || method === 'reset') expect(service).toHaveBeenLastCalledWith(token, password)
      else expect(service).toHaveBeenLastCalledWith(payload(password))
    }
  })
  it('accepts eight characters for admin authentication', async () => {
    const login = vi.spyOn(adminAuthService, 'login').mockResolvedValue(session)
    expect((await request(app).post('/api/v1/admin/auth/login').send({ email, password: 'abcdefgh' })).status).toBe(200)
    expect(login).toHaveBeenCalledWith(expect.objectContaining({ email, password: 'abcdefgh' }))
  })
})

describe('password hashing and authentication compatibility', () => {
  it.each(['abcdefgh', 'a longer existing password'])('registers and logs in using %s without rewriting its hash', async password => {
    let customer
    const repository = {
      findByEmail: async () => customer,
      create: vi.fn(async (value, password_hash) => (customer = { ...value, id: 1, ativo: true, password_hash })),
      createSession: vi.fn(), recordSuccess: vi.fn(), recordFailure: vi.fn(), updatePassword: vi.fn(),
    }
    const service = createCustomerAuthService(repository)
    await service.register(customerRegisterSchema.parse({ ...registration, password }))
    const storedHash = customer.password_hash
    expect(await verifyPassword(password, storedHash)).toBe(true)
    expect((await service.login(customerLoginSchema.parse({ email, password }))).user.id).toBe(1)
    await expect(service.login({ email, password: 'wrong-password' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(customer.password_hash).toBe(storedHash)
    expect(repository.updatePassword).not.toHaveBeenCalled()
  })
  it.each(['activate', 'reset'])('%s hashes an eight-character password using the existing algorithm', async method => {
    const consume = vi.fn()
    const service = createCustomerAuthService({ consumeActivation: consume, consumeReset: consume })
    await service[method](token, 'abcdefgh')
    const [tokenHash, passwordHash] = consume.mock.calls[0]
    expect(tokenHash).toBe(service.hash(token))
    expect(passwordHash).toMatch(/^scrypt\$/)
    expect(await verifyPassword('abcdefgh', passwordHash)).toBe(true)
  })
  it('changes an existing password to eight characters and preserves the different-password rule', async () => {
    const currentPassword = 'existing password'
    const repository = { findById: async () => ({ password_hash: await hashPassword(currentPassword) }), updatePassword: vi.fn() }
    const value = customerPasswordSchema.parse({ currentPassword, newPassword: 'abcdefgh' })
    await createCustomerAuthService(repository).changePassword(1, value.currentPassword, value.newPassword)
    expect(repository.updatePassword.mock.calls[0][0]).toBe(1)
    expect(await verifyPassword('abcdefgh', repository.updatePassword.mock.calls[0][1])).toBe(true)
    expect(customerPasswordSchema.safeParse({ currentPassword: 'abcdefgh', newPassword: 'abcdefgh' }).success).toBe(false)
  })
})
