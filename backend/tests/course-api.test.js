import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe('courses API validation', () => {
  it('rejects unknown query parameters', async () => {
    const response = await request(app).get('/api/v1/courses?status=DRAFT')
    expect(response.status).toBe(400)
  })
  it('rejects limits above the public maximum', async () => {
    const response = await request(app).get('/api/v1/courses?limit=100')
    expect(response.status).toBe(400)
  })
  it('rejects malformed slugs', async () => {
    const response = await request(app).get('/api/v1/courses/INVALID%20SLUG')
    expect(response.status).toBe(400)
  })
})
