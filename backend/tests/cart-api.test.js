import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe('cart API input validation', () => {
  for (const quantity of [0, -1, 100, '2', 'DROP TABLE']) {
    it(`rejects invalid quantity ${quantity}`, async () => {
      const response = await request(app).post('/api/v1/cart/validate').send({ items: [{ variantId: 1, quantity }] })
      expect(response.status).toBe(400)
    })
  }

  it('rejects malicious variant ids before any SQL query', async () => {
    const response = await request(app).post('/api/v1/cart/validate').send({ items: [{ variantId: '1 OR 1=1', quantity: 1 }] })
    expect(response.status).toBe(400)
  })
})
