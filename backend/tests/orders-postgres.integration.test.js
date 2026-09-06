import { createHash } from 'node:crypto'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createOrderRepository } from '../src/repositories/orderRepository.js'
import { createPaymentRepository } from '../src/repositories/paymentRepository.js'

const { Client } = pg
const url = process.env.TEST_DATABASE_ADMIN_URL
const suffix = `${process.pid}-${Date.now()}`
let admin, customerId, productId, variantId, expiryVariantId, highVariantId, winner, winnerInput, orderRepo, paymentRepo
const hash = (value) => createHash('sha256').update(value).digest('hex')

async function tx(work) {
  const client = new Client({ connectionString: url }); await client.connect()
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result }
  catch (error) { await client.query('ROLLBACK'); throw error }
  finally { await client.end() }
}

function input(key, code, email = `${code.toLowerCase()}@example.com`) {
  const accessToken = `token-${code}`
  return { keyHash: hash(key), requestHash: hash(`request-${key}`), publicCode: code, accessToken, accessTokenHash: hash(accessToken), customerId, customer: { name: 'Cliente Teste', email, phone: '61999999999' }, address: { postalCode: '72000000', street: 'Rua Teste', number: 'S/N', complement: '', neighborhood: 'Centro', city: 'Brasília', state: 'DF' }, quote: { subtotal: '100.00', shipping: '10.00', total: '110.00', selectedShipping: { service: 'Teste', carrier: null, estimatedDays: 7 }, items: [{ variantId, quantity: 1, unitPrice: '100.00', subtotal: '100.00' }] } }
}

describe('orders, stock and payment with isolated PostgreSQL', () => {
  beforeAll(async () => {
    if (!url || !new URL(url).pathname.slice(1).endsWith('_test')) throw new Error('Pedidos exigem banco _test')
    admin = new Client({ connectionString: url }); await admin.connect()
    customerId = (await admin.query({ text: `INSERT INTO app.clientes(email,nome,sobrenome,telefone,password_hash) VALUES($1,'Cliente Teste','', '61999999999','test-hash') RETURNING id`, values: [`orders-${suffix}@example.com`] })).rows[0].id
    const category = await admin.query("SELECT id FROM app.categorias WHERE slug='brincos'")
    productId = (await admin.query({ text: `INSERT INTO app.produtos(categoria_id,nome,slug,descricao,status) VALUES($1,$2,$3,'Teste transacional','ACTIVE') RETURNING id`, values: [category.rows[0].id, 'Produto concorrência', `produto-concorrencia-${suffix}`] })).rows[0].id
    variantId = Number((await admin.query({ text: `INSERT INTO app.produto_variantes(produto_id,sku,nome,preco,estoque,ativa) VALUES($1,$2,'Única',100,1,TRUE) RETURNING id`, values: [productId, `CONC-${suffix}`] })).rows[0].id)
    expiryVariantId = Number((await admin.query({ text: `INSERT INTO app.produto_variantes(produto_id,sku,nome,preco,estoque,ativa) VALUES($1,$2,'Expira',100,1,TRUE) RETURNING id`, values: [productId, `EXP-${suffix}`] })).rows[0].id)
    highVariantId = Number((await admin.query({ text: `INSERT INTO app.produto_variantes(produto_id,sku,nome,preco,estoque,ativa) VALUES($1,$2,'Alta concorrencia',100,5,TRUE) RETURNING id`, values: [productId, `HIGH-${suffix}`] })).rows[0].id)
    orderRepo = createOrderRepository(tx); paymentRepo = createPaymentRepository(tx)
  })

  afterAll(async () => {
    if (!admin) return
    await admin.query({ text: `DELETE FROM app.webhook_eventos WHERE gateway_event_id LIKE $1`, values: [`evt-${suffix}%`] })
    await admin.query({ text: `DELETE FROM app.movimentos_estoque WHERE variante_id=ANY($1)`, values: [[variantId, expiryVariantId, highVariantId]] })
    await admin.query({ text: `DELETE FROM app.reservas_estoque WHERE variante_id=ANY($1)`, values: [[variantId, expiryVariantId, highVariantId]] })
    await admin.query({ text: `DELETE FROM app.pagamentos WHERE pedido_id IN (SELECT id FROM app.pedidos WHERE codigo_publico LIKE 'BP-7%')` })
    await admin.query(`DELETE FROM app.pedido_status_historico WHERE pedido_id IN (SELECT id FROM app.pedidos WHERE codigo_publico LIKE 'BP-7%')`)
    await admin.query(`DELETE FROM app.pedido_itens WHERE pedido_id IN (SELECT id FROM app.pedidos WHERE codigo_publico LIKE 'BP-7%')`)
    await admin.query(`DELETE FROM app.idempotency_keys WHERE escopo='CREATE_ORDER' AND recurso_id IN (SELECT id::text FROM app.pedidos WHERE codigo_publico LIKE 'BP-7%')`)
    const customers = await admin.query(`SELECT cliente_id FROM app.pedidos WHERE codigo_publico LIKE 'BP-7%'`)
    await admin.query(`DELETE FROM app.pedidos WHERE codigo_publico LIKE 'BP-7%'`)
    for (const row of customers.rows) await admin.query({ text: `DELETE FROM app.enderecos WHERE cliente_id=$1`, values: [row.cliente_id] })
    await admin.query({ text: `DELETE FROM app.clientes WHERE id=$1`, values: [customerId] })
    await admin.query({ text: `DELETE FROM app.produto_variantes WHERE id=ANY($1)`, values: [[variantId, expiryVariantId, highVariantId]] }); await admin.query({ text: `DELETE FROM app.produtos WHERE id=$1`, values: [productId] }); await admin.end()
  })

  it('rolls back completely when authoritative price changed', async () => {
    const bad = input(`key-rollback-${suffix}`, 'BP-7000000000000003'); bad.quote.items[0].unitPrice = '1.00'
    await expect(orderRepo.create(bad)).rejects.toMatchObject({ code: 'PRICE_CHANGED' })
    expect((await admin.query(`SELECT count(*)::integer count FROM app.pedidos WHERE codigo_publico='BP-7000000000000003'`)).rows[0].count).toBe(0)
  })

  it('rolls back customer and idempotency data after an intermediate database failure', async () => {
    const invalid = input(`key-mid-rollback-${suffix}`, 'BP-7000000000000005', `mid-rollback-${suffix}@example.com`)
    invalid.customerId = 2147483647
    await expect(orderRepo.create(invalid)).rejects.toBeTruthy()
    expect((await admin.query({ text: `SELECT count(*)::integer count FROM app.clientes WHERE email=$1`, values: [invalid.customer.email] })).rows[0].count).toBe(0)
    expect((await admin.query({ text: `SELECT count(*)::integer count FROM app.idempotency_keys WHERE chave_hash=$1`, values: [invalid.keyHash] })).rows[0].count).toBe(0)
  })

  it('expires and releases a reservation idempotently', async () => {
    const expiring = input(`key-expiry-${suffix}`, 'BP-7000000000000004', `expiry-${suffix}@example.com`)
    expiring.quote.items[0].variantId = expiryVariantId
    const created = await orderRepo.create(expiring)
    await admin.query({ text: `UPDATE app.reservas_estoque SET expira_em=now()-interval '1 minute' WHERE pedido_id=(SELECT id FROM app.pedidos WHERE codigo_publico=$1)`, values: [created.code] })
    expect((await orderRepo.findPublic(created.code, hash(expiring.accessToken))).status).toBe('CANCELLED')
    expect((await orderRepo.findPublic(created.code, hash(expiring.accessToken))).status).toBe('CANCELLED')
    const expiredOrder = await admin.query({ text: `SELECT id FROM app.pedidos WHERE codigo_publico=$1`, values: [created.code] })
    await admin.query({ text: `INSERT INTO app.pagamentos(pedido_id,provedor,gateway_payment_id,idempotency_key,status,metodo,valor) VALUES($1,'sandbox',$2,$3,'PENDING','PIX',110)`, values: [expiredOrder.rows[0].id, `pay-expired-${suffix}`, `payment-expired-${suffix}`] })
    await expect(paymentRepo.processWebhook({ provider: 'sandbox', eventId: `evt-${suffix}-expired`, paymentId: `pay-expired-${suffix}`, reference: created.code, type: 'payment.approved', status: 'APPROVED', amount: '110.00', currency: 'BRL', payloadHash: hash('expired-event') })).resolves.toEqual({ latePayment: true })
    expect((await admin.query({ text: `SELECT estoque,estoque_reservado FROM app.produto_variantes WHERE id=$1`, values: [expiryVariantId] })).rows[0]).toEqual({ estoque: 1, estoque_reservado: 0 })
  })

  it('allows only one concurrent reservation for physical stock one', async () => {
    const a = input(`key-a-${suffix}`, 'BP-7000000000000001')
    const b = input(`key-b-${suffix}`, 'BP-7000000000000002')
    const results = await Promise.allSettled([orderRepo.create(a), orderRepo.create(b)])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')[0].reason).toMatchObject({ code: 'INSUFFICIENT_STOCK' })
    winner = results.find((result) => result.status === 'fulfilled').value
    winnerInput = winner.code === a.publicCode ? a : b
    const stock = await admin.query({ text: `SELECT estoque,estoque_reservado FROM app.produto_variantes WHERE id=$1`, values: [variantId] })
    expect(stock.rows[0]).toEqual({ estoque: 1, estoque_reservado: 1 })
  })

  it('never exceeds five reservations under twenty simultaneous buyers', async () => {
    const attempts = Array.from({ length: 20 }, (_, index) => {
      const value = input(`key-high-${index}-${suffix}`, `BP-71${String(index).padStart(14,'0')}`)
      value.quote.items[0].variantId = highVariantId
      return orderRepo.create(value)
    })
    const results = await Promise.allSettled(attempts)
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(5)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(15)
    expect(results.filter((result) => result.status === 'rejected').every((result) => result.reason.code === 'INSUFFICIENT_STOCK')).toBe(true)
    expect((await admin.query({ text: `SELECT estoque,estoque_reservado FROM app.produto_variantes WHERE id=$1`, values: [highVariantId] })).rows[0]).toEqual({ estoque: 5, estoque_reservado: 5 })
    expect((await admin.query({ text: `SELECT count(*)::integer count FROM app.reservas_estoque WHERE variante_id=$1 AND status='ACTIVE'`, values: [highVariantId] })).rows[0].count).toBe(5)
  })

  it('replays the same idempotent request and rejects a different hash', async () => {
    for (let attempt=0;attempt<10;attempt+=1) await expect(orderRepo.create(winnerInput)).resolves.toMatchObject({ code: winner.code, replayed: true })
    await expect(orderRepo.create({ ...winnerInput, requestHash: hash('different') })).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' })
    expect((await admin.query({ text: `SELECT count(*)::integer count FROM app.pedidos WHERE codigo_publico=$1`, values: [winner.code] })).rows[0].count).toBe(1)
  })

  it('confirms stock once from an authenticated normalized event and ignores its retry', async () => {
    const order = await admin.query({ text: `SELECT id FROM app.pedidos WHERE codigo_publico=$1`, values: [winner.code] })
    await admin.query({ text: `INSERT INTO app.pagamentos(pedido_id,provedor,gateway_payment_id,idempotency_key,status,metodo,valor) VALUES($1,'sandbox',$2,$3,'PENDING','PIX',110)`, values: [order.rows[0].id, `pay-${suffix}`, `payment-${suffix}`] })
    const event = { provider: 'sandbox', eventId: `evt-${suffix}-1`, paymentId: `pay-${suffix}`, reference: winner.code, type: 'payment.approved', status: 'APPROVED', amount: '110.00', currency: 'BRL', payloadHash: hash('event') }
    await expect(paymentRepo.processWebhook(event)).resolves.toEqual({ approved: true })
    await expect(paymentRepo.processWebhook(event)).resolves.toEqual({ duplicate: true })
    const state = await admin.query({ text: `SELECT p.status,v.estoque,v.estoque_reservado FROM app.pedidos p JOIN app.pedido_itens i ON i.pedido_id=p.id JOIN app.produto_variantes v ON v.id=i.variante_id WHERE p.id=$1`, values: [order.rows[0].id] })
    expect(state.rows[0]).toEqual({ status: 'PAID', estoque: 0, estoque_reservado: 0 })
  })
})
