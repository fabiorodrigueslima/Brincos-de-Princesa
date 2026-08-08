import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe('catalog API validation', () => {
  it('rejects unknown sort values before querying the database', async () => {
    const response = await request(app).get('/api/v1/products?sort=DROP_TABLE')
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects page sizes above the public limit', async () => {
    const response = await request(app).get('/api/v1/products?limit=500')
    expect(response.status).toBe(400)
  })

  it('returns a controlled service response when PostgreSQL is not configured', async () => {
    const response = await request(app).get('/api/v1/products')
    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE')
    expect(response.body.error).not.toHaveProperty('stack')
  })

  it('rejects malformed product slugs', async () => {
    const response = await request(app).get('/api/v1/products/INVALID%20SLUG')
    expect(response.status).toBe(400)
  })
})
