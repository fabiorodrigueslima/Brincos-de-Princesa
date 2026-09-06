import request from 'supertest'
import { describe,expect,it } from 'vitest'
import { app } from '../src/app.js'

describe('customer API security boundary',()=>{
  it('rejects weak registration before database access',async()=>{const response=await request(app).post('/api/v1/customers/auth/register').send({name:'M',email:'bad',phone:'1',password:'123'});expect(response.status).toBe(400)})
  it('rejects mass assignment on registration',async()=>{const response=await request(app).post('/api/v1/customers/auth/register').send({name:'Maria',email:'maria@example.com',phone:'11999999999',password:'senha-segura-123',admin:true});expect(response.status).toBe(400)})
  it('protects profile, orders, addresses and privacy requests without a session',async()=>{for(const path of ['/api/v1/customers/me','/api/v1/customers/orders'])expect((await request(app).get(path)).status).toBe(401);expect((await request(app).post('/api/v1/customers/addresses').send({})).status).toBe(401);expect((await request(app).post('/api/v1/customers/privacy-requests').send({type:'DELETION'})).status).toBe(401)})
  it('requires a strict reset token and strong password',async()=>{expect((await request(app).post('/api/v1/customers/auth/reset').send({token:'short',password:'weak'})).status).toBe(400)})
  it('prevents caching protected customer data',async()=>{const response=await request(app).get('/api/v1/customers/me');expect(response.headers['cache-control']).toContain('no-store');expect(response.headers.pragma).toBe('no-cache')})
})
