import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

const valid = { items: [{ variantId: 1, quantity: 1 }], customer: { name: 'Maria Silva', email: 'maria@example.com', phone: '61999999999' }, address: { postalCode: '72000000', street: 'Rua A', number: 'S/N', complement: '', neighborhood: 'Centro', city: 'Brasília', state: 'DF' } }

describe('checkout API validation and security', () => {
  for (const postalCode of ['72000-000', 'abc', '1 OR 1=1', '']) it(`rejects invalid postal code ${postalCode}`, async () => { expect((await request(app).get(`/api/v1/checkout/postal-code/${encodeURIComponent(postalCode || 'x')}`)).status).toBe(400) })
  it('rejects empty cart and malformed personal data', async () => { expect((await request(app).post('/api/v1/checkout/quote').send({ ...valid, items: [], customer: { ...valid.customer, email: 'invalid' } })).status).toBe(400) })
  for (const field of ['price', 'subtotal', 'shippingPrice', 'total']) it(`rejects forged ${field}`, async () => { expect((await request(app).post('/api/v1/checkout/quote').send({ ...valid, [field]: '0.01' })).status).toBe(400) })
  it('rejects extra item fields and excessive quantities', async () => { expect((await request(app).post('/api/v1/checkout/quote').send({ ...valid, items: [{ variantId: 1, quantity: 100, price: 1 }] })).status).toBe(400) })
})
