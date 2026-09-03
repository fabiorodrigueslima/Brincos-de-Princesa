import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe('health endpoints', () => {
  it('reports that the API process is alive', async () => {
    const response = await request(app).get('/api/v1/health/live')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
    expect(response.headers['x-powered-by']).toBeUndefined()
    expect(response.headers['x-request-id']).toBeTruthy()
  })

  it('offers conventional health and readiness aliases',async()=>{expect((await request(app).get('/api/v1/health')).status).toBe(200);expect((await request(app).get('/api/v1/ready')).status).toBe(503)})

  it('returns a controlled 404 response', async () => {
    const response = await request(app).get('/api/v1/unknown')
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('reports not ready while the database is not configured', async () => {
    const response = await request(app).get('/api/v1/health/ready')
    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      status: 'not_ready',
      checks: { api: 'ok', database: 'unavailable' },
    })
  })

  it('rejects a browser origin outside the allowlist', async () => {
    const response = await request(app).get('/api/v1/health/live').set('Origin', 'https://example.invalid')
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('ORIGIN_NOT_ALLOWED')
  })
})
