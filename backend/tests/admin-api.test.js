import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe('admin API security', () => {
  it('rejects every protected resource without a session', async () => { for(const path of ['/dashboard','/products','/stock','/orders','/courses','/categories','/collections','/settings'])expect((await request(app).get(`/api/v1/admin${path}`)).status).toBe(401); for(const path of ['/categories','/collections']) expect((await request(app).post(`/api/v1/admin${path}`).send({})).status).toBe(401) })
  it('rejects fake sessions', async () => { expect((await request(app).get('/api/v1/admin/dashboard').set('Cookie','__Host-bdp_admin=forged')).status).toBe(401) })
  it('prevents caching of administrative responses, including failures', async () => { const response=await request(app).get('/api/v1/admin/dashboard');expect(response.headers['cache-control']).toContain('no-store');expect(response.headers.pragma).toBe('no-cache') })
  it('rejects mass assignment and weak login payloads before database access', async () => { expect((await request(app).post('/api/v1/admin/auth/login').send({email:'owner@example.com',password:'short',role:'OWNER'})).status).toBe(400) })
  it('rejects oversized bodies through the global payload limit', async () => { expect((await request(app).post('/api/v1/admin/auth/login').send({email:'a@example.com',password:'x'.repeat(110000)})).status).toBe(413) })
})
