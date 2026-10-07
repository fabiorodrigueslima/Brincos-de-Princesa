import { randomBytes, randomUUID, createHash } from 'node:crypto'
import pg from 'pg'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.js'
import { customerRepository } from '../src/repositories/customerRepository.js'
import { customerAuthService } from '../src/services/customerAuthService.js'
import { orderRepository } from '../src/repositories/orderRepository.js'
import { emailProvider } from '../src/providers/emailProvider.js'
import { shippingProvider } from '../src/providers/shippingProvider.js'
import { paymentProvider } from '../src/providers/paymentProvider.js'
import { customerAuthRateLimit, orderMutationRateLimit } from '../src/security/httpSecurity.js'
import { hashPassword, verifyPassword } from '../src/security/password.js'

const hash = value => createHash('sha256').update(value).digest('hex')
const password = 'A05 valid password 123!'
let admin, customerId, productId, variantId, email, originalSetting
const createdCustomers = new Set()
const flag = enabled => admin.query({ text: "UPDATE app.configuracoes SET valor=$1::jsonb WHERE chave='checkout.enabled'", values: [JSON.stringify(enabled)] })
const payload = () => ({ items: [{ variantId, quantity: 1 }], customer: { name: 'Cliente teste', email, phone: '11999999999' }, address: { postalCode: '01001000', street: 'Rua teste', number: '1', complement: '', neighborhood: 'Centro', city: 'São Paulo', state: 'SP' }, shippingOptionId: 'test' })
const cookie = async () => {
  const value = randomBytes(32).toString('base64url')
  await customerRepository.createSession(customerId, hash(value), hash('csrf'), 1)
  return `bdp_customer=${value}`
}
const newOrder = sessionCookie => request(app).post('/api/v1/orders').set('Origin','http://localhost:5173').set('X-CSRF-Token','csrf').set('Cookie', sessionCookie).set('Idempotency-Key', randomUUID()).send(payload())
const requestToken = async () => {
  await customerAuthService.requestActivation(email)
  return new URL(emailProvider.sendAccountActivation.mock.calls.at(-1)[0].activationUrl).searchParams.get('token')
}
const snapshot = async () => ({
  counts: (await admin.query(`SELECT (SELECT count(*) FROM app.pedidos) pedidos,(SELECT count(*) FROM app.pedido_itens) itens,(SELECT count(*) FROM app.reservas_estoque) reservas,(SELECT count(*) FROM app.movimentos_estoque) movimentos,(SELECT count(*) FROM app.email_outbox) outbox,(SELECT count(*) FROM app.pagamentos) pagamentos,(SELECT count(*) FROM app.idempotency_keys) chaves`)).rows[0],
  stock: (await admin.query({ text: 'SELECT estoque,estoque_reservado FROM app.produto_variantes WHERE id=$1', values: [variantId] })).rows[0],
})

beforeAll(async () => {
  const url = new URL(process.env.TEST_DATABASE_ADMIN_URL)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !url.pathname.endsWith('_test')) throw new Error('Local _test database required')
  admin = new pg.Client({ connectionString: url.toString() })
  await admin.connect()
  originalSetting = (await admin.query("SELECT valor FROM app.configuracoes WHERE chave='checkout.enabled'")).rows[0].valor
})
beforeEach(async () => {
  for (const limiter of [customerAuthRateLimit, orderMutationRateLimit]) for (const ip of ['127.0.0.1', '::ffff:127.0.0.1']) limiter.resetKey(ip)
  vi.spyOn(emailProvider, 'sendAccountActivation').mockResolvedValue(undefined)
  vi.spyOn(shippingProvider, 'quote').mockResolvedValue([{ id: 'test', service: 'Teste', carrier: null, price: '0.00', estimatedDays: 7 }])
  vi.spyOn(paymentProvider, 'createPayment').mockResolvedValue({ preferenceId: `test-${randomUUID()}`, checkoutUrl: 'https://example.invalid/checkout' })
  email = `a05-${randomUUID()}@example.invalid`
  customerId = (await admin.query({ text: "INSERT INTO app.clientes(email,nome,sobrenome,telefone) VALUES($1,'Cliente antigo','','11999999999') RETURNING id", values: [email] })).rows[0].id
  createdCustomers.add(customerId)
  await admin.query({ text: "INSERT INTO app.enderecos(cliente_id,cep,rua,numero,bairro,cidade,uf,destinatario) VALUES($1,'01001000','Rua privada','1','Centro','São Paulo','SP','Cliente antigo')", values: [customerId] })
  productId = (await admin.query({ text: "INSERT INTO app.produtos(nome,slug,descricao,status) VALUES('A06',$1,'Teste','ACTIVE') RETURNING id", values: [`a06-${randomUUID()}`] })).rows[0].id
  variantId = Number((await admin.query({ text: "INSERT INTO app.produto_variantes(produto_id,sku,nome,preco,estoque,ativa) VALUES($1,$2,'Única',100,10,TRUE) RETURNING id", values: [productId, randomUUID()] })).rows[0].id)
  await flag(false)
})
afterEach(async () => {
  vi.restoreAllMocks()
  if (!admin) return
  const ids = [...createdCustomers]
  const orderIds = (await admin.query({ text: 'SELECT id FROM app.pedidos WHERE cliente_id=ANY($1::bigint[])', values: [ids] })).rows.map(row => row.id)
  for (const table of ['pagamentos', 'pedido_itens', 'reservas_estoque', 'movimentos_estoque', 'pedido_status_historico']) {
    await admin.query({ text: `DELETE FROM app.${table} WHERE pedido_id=ANY($1::bigint[])`, values: [orderIds] })
  }
  await admin.query({ text: 'DELETE FROM app.idempotency_keys WHERE recurso_id=ANY($1::text[])', values: [orderIds.map(String)] })
  await admin.query({ text: "DELETE FROM app.email_outbox WHERE event_key=ANY($1::text[])", values: [orderIds.flatMap(id => [`order-received:${id}`, `payment-confirmed:${id}`])] })
  await admin.query({ text: 'DELETE FROM app.pedidos WHERE cliente_id=ANY($1::bigint[])', values: [ids] })
  await admin.query({ text: 'DELETE FROM app.enderecos WHERE cliente_id=ANY($1::bigint[])', values: [ids] })
  await admin.query({ text: 'DELETE FROM app.clientes WHERE id=ANY($1::bigint[])', values: [ids] })
  createdCustomers.clear()
  await admin.query({ text: 'DELETE FROM app.produto_variantes WHERE id=$1', values: [variantId] })
  await admin.query({ text: 'DELETE FROM app.produtos WHERE id=$1', values: [productId] })
  await flag(originalSetting)
})
afterAll(async () => { if (admin) await admin.end() })

describe('A05 activation with real PostgreSQL and runtime permissions', () => {
  it('keeps new registration working with an authenticated session', async () => {
    const fresh = `new-${randomUUID()}@example.invalid`
    const response = await request(app).post('/api/v1/customers/auth/register').send({ name: 'Nova cliente', email: fresh, phone: '11999999999', password })
    expect(response.status).toBe(201)
    createdCustomers.add(String(response.body.data.user.id))
    const me = await request(app).get('/api/v1/customers/me').set('Cookie', response.headers['set-cookie'])
    expect(me.status).toBe(200)
    expect(me.body.data.profile.email).toBe(fresh)
  })
  it('does not let knowledge of a legacy email create credentials, duplicate accounts or access private resources', async () => {
    const response = await request(app).post('/api/v1/customers/auth/register').send({ name: 'Outra pessoa', email, phone: '11999999999', password })
    expect(response.status).toBe(409)
    expect(response.headers['set-cookie']).toBeUndefined()
    expect((await admin.query({ text: 'SELECT password_hash,nome FROM app.clientes WHERE email=$1', values: [email] })).rows).toEqual([{ password_hash: null, nome: 'Cliente antigo' }])
    for (const path of ['/me', '/orders']) expect((await request(app).get(`/api/v1/customers${path}`)).status).toBe(401)
    expect((await request(app).post('/api/v1/customers/addresses').send(payload().address)).status).toBe(401)
    expect((await request(app).post('/api/v1/customers/auth/login').send({ email, password })).status).toBe(401)
    expect((await admin.query({ text: 'SELECT count(*) FROM app.cliente_sessoes WHERE cliente_id=$1', values: [customerId] })).rows[0].count).toBe('0')
  })
  it('gives identical activation request responses for eligible, unknown and password accounts', async () => {
    const known = await request(app).post('/api/v1/customers/auth/activation/request').send({ email })
    const unknown = await request(app).post('/api/v1/customers/auth/activation/request').send({ email: 'unknown@example.invalid' })
    await admin.query({ text: 'UPDATE app.clientes SET password_hash=$1 WHERE id=$2', values: [await hashPassword(password), customerId] })
    const registered = await request(app).post('/api/v1/customers/auth/activation/request').send({ email })
    for (const response of [known, unknown, registered]) {
      expect(response.status).toBe(202)
      expect(response.body).toEqual({ data: { accepted: true } })
      expect(response.headers['set-cookie']).toBeUndefined()
    }
    expect(emailProvider.sendAccountActivation).toHaveBeenCalledOnce()
  })
  it('activates only with the emailed proof, preserves identity and addresses, revokes old sessions and tokens, and requires login', async () => {
    const oldCookie = await cookie()
    const first = await requestToken()
    const second = await requestToken()
    const reset = randomBytes(32).toString('base64url')
    await customerRepository.createReset(customerId, hash(reset))
    const response = await request(app).post('/api/v1/customers/auth/activation/confirm').send({ token: first, password })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { activated: true } })
    const customer = (await admin.query({ text: 'SELECT id,nome,password_hash,email_verificado_em FROM app.clientes WHERE email=$1', values: [email] })).rows
    expect(customer).toHaveLength(1)
    expect(customer[0]).toMatchObject({ id: customerId, nome: 'Cliente antigo', email_verificado_em: expect.any(Date) })
    expect(await verifyPassword(password, customer[0].password_hash)).toBe(true)
    expect((await request(app).get('/api/v1/customers/me').set('Cookie', oldCookie)).status).toBe(401)
    expect((await request(app).get('/api/v1/customers/me')).status).toBe(401)
    await expect(customerAuthService.activate(first, password)).rejects.toMatchObject({ code: 'ACTIVATION_TOKEN_INVALID' })
    await expect(customerAuthService.activate(second, password)).rejects.toMatchObject({ code: 'ACTIVATION_TOKEN_INVALID' })
    await expect(customerAuthService.reset(reset, password)).rejects.toMatchObject({ code: 'RESET_TOKEN_INVALID' })
    const login = await request(app).post('/api/v1/customers/auth/login').send({ email, password })
    expect(login.status).toBe(200)
    const me = await request(app).get('/api/v1/customers/me').set('Cookie', login.headers['set-cookie'])
    expect(me.body.data.profile.addresses[0].rua).toBe('Rua privada')
  })
  it('rejects invalid, expired and recovery-purpose tokens without altering password or sessions', async () => {
    const token = await requestToken()
    await admin.query({ text: "UPDATE app.cliente_activation_tokens SET criado_em=now()-interval '1 hour',expira_em=now()-interval '1 minute' WHERE cliente_id=$1", values: [customerId] })
    const reset = randomBytes(32).toString('base64url')
    await customerRepository.createReset(customerId, hash(reset))
    for (const value of [randomBytes(32).toString('base64url'), token, reset]) await expect(customerAuthService.activate(value, password)).rejects.toMatchObject({ code: 'ACTIVATION_TOKEN_INVALID' })
    expect((await admin.query({ text: 'SELECT password_hash FROM app.clientes WHERE id=$1', values: [customerId] })).rows[0].password_hash).toBeNull()
    expect((await admin.query({ text: 'SELECT count(*) FROM app.cliente_sessoes WHERE cliente_id=$1', values: [customerId] })).rows[0].count).toBe('0')
  })
  it('rejects activation tokens at the recovery endpoint', async () => {
    const token = await requestToken()
    await expect(customerAuthService.reset(token, password)).rejects.toMatchObject({ code: 'RESET_TOKEN_INVALID' })
    await expect(customerAuthService.activate(token, password)).resolves.toEqual({ activated: true })
  })
  it.each(['inactive', 'anonymized'])('rejects proof if the account becomes %s before consumption', async state => {
    const token = await requestToken()
    await admin.query({ text: state === 'inactive' ? 'UPDATE app.clientes SET ativo=FALSE WHERE id=$1' : 'UPDATE app.clientes SET anonimizado_em=now() WHERE id=$1', values: [customerId] })
    await expect(customerAuthService.activate(token, password)).rejects.toMatchObject({ code: 'ACTIVATION_TOKEN_INVALID' })
    expect((await admin.query({ text: 'SELECT password_hash FROM app.clientes WHERE id=$1', values: [customerId] })).rows[0].password_hash).toBeNull()
  })
  it('rolls back password, proof and session state if an intermediate persistent change fails', async () => {
    const token = await requestToken()
    await cookie()
    // Test-only constraint forces failure after the password UPDATE, inside the transaction.
    await admin.query(`ALTER TABLE app.cliente_activation_tokens ADD CONSTRAINT a05_rollback_probe CHECK (usado_em IS NULL OR cliente_id <> ${Number(customerId)}) NOT VALID`)
    try {
      await expect(customerAuthService.activate(token, password)).rejects.toMatchObject({ code: '23514' })
      expect((await admin.query({ text: 'SELECT password_hash,email_verificado_em FROM app.clientes WHERE id=$1', values: [customerId] })).rows[0]).toEqual({ password_hash: null, email_verificado_em: null })
      expect((await admin.query({ text: 'SELECT usado_em FROM app.cliente_activation_tokens WHERE token_hash=$1', values: [hash(token)] })).rows[0].usado_em).toBeNull()
      expect((await admin.query({ text: 'SELECT revogada_em FROM app.cliente_sessoes WHERE cliente_id=$1', values: [customerId] })).rows[0].revogada_em).toBeNull()
    } finally {
      await admin.query('ALTER TABLE app.cliente_activation_tokens DROP CONSTRAINT a05_rollback_probe')
    }
    await expect(customerAuthService.activate(token, password)).resolves.toEqual({ activated: true })
  })
  it('serializes concurrent activation even using two independently valid tokens', async () => {
    const first = await requestToken(), second = await requestToken()
    const results = await Promise.allSettled([customerAuthService.activate(first, password), customerAuthService.activate(second, 'Another valid password 456!')])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(result => result.status === 'rejected').reason.code).toBe('ACTIVATION_TOKEN_INVALID')
    expect((await admin.query({ text: 'SELECT count(*) FROM app.clientes WHERE email=$1', values: [email] })).rows[0].count).toBe('1')
    expect((await admin.query({ text: 'SELECT count(*) FROM app.cliente_activation_tokens WHERE cliente_id=$1 AND usado_em IS NULL', values: [customerId] })).rows[0].count).toBe('0')
  })
})

describe('A06 backend commercial gate with real PostgreSQL', () => {
  it('blocks normal authenticated HTTP creation and quotation before effects or providers', async () => {
    const before = await snapshot()
    const response = await newOrder(await cookie())
    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('CHECKOUT_DISABLED')
    expect((await request(app).post('/api/v1/checkout/quote').send(payload())).body.error.code).toBe('CHECKOUT_DISABLED')
    expect(await snapshot()).toEqual(before)
    expect(shippingProvider.quote).not.toHaveBeenCalled()
    expect(paymentProvider.createPayment).not.toHaveBeenCalled()
  })
  it('allows enabled purchases, prevents new ones when disabled and allows reactivation', async () => {
    const sessionCookie = await cookie()
    await flag(true)
    expect((await newOrder(sessionCookie)).status).toBe(201)
    await flag(false)
    const before = await snapshot()
    expect((await newOrder(sessionCookie)).status).toBe(503)
    expect(await snapshot()).toEqual(before)
    await flag(true)
    expect((await newOrder(sessionCookie)).status).toBe(201)
    expect(shippingProvider.quote).toHaveBeenCalledTimes(2)
    expect(paymentProvider.createPayment).not.toHaveBeenCalled()
  })
  it('rechecks after a configuration change during the quote without leaving partial rows', async () => {
    await flag(true)
    shippingProvider.quote.mockImplementationOnce(async () => { await flag(false); return [{ id: 'test', service: 'Teste', price: '0.00', estimatedDays: 7 }] })
    const before = await snapshot()
    const response = await newOrder(await cookie())
    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('CHECKOUT_DISABLED')
    expect(await snapshot()).toEqual(before)
  })
  it('protects direct repository entry before idempotency and stock writes', async () => {
    const before = await snapshot()
    await expect(orderRepository.create({})).rejects.toMatchObject({ code: 'CHECKOUT_DISABLED' })
    expect(await snapshot()).toEqual(before)
  })
  it('keeps previously created orders queryable and payable after disabling new purchases', async () => {
    await flag(true)
    const created = await newOrder(await cookie())
    expect(created.status).toBe(201)
    const { code, accessToken } = created.body.data
    await flag(false)
    const before = await snapshot()
    const found = await request(app).get(`/api/v1/orders/${code}`).set('X-Order-Token', accessToken)
    expect(found.status).toBe(200)
    expect(found.body.data.status).toBe('PENDING_PAYMENT')
    expect(await snapshot()).toEqual(before)
    const payment = await request(app).post(`/api/v1/orders/${code}/payments`).set('X-Order-Token', accessToken).set('Idempotency-Key', randomUUID()).send({ method: 'PIX' })
    expect(payment.status).toBe(201)
    expect(paymentProvider.createPayment).toHaveBeenCalledOnce()
    expect((await snapshot()).stock).toEqual(before.stock)
  })
})
