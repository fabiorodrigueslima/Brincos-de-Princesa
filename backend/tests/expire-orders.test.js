import { describe,expect,it,vi } from 'vitest'
import { createOrderRepository } from '../src/repositories/orderRepository.js'

describe('expired order job',()=>{
  it('is idempotent when no pending reservation is expired',async()=>{const client={query:vi.fn(async()=>({rows:[],rowCount:0}))};const repository=createOrderRepository(async(work)=>work(client));await expect(repository.expireReservations()).resolves.toEqual({expired:0});await expect(repository.expireReservations()).resolves.toEqual({expired:0});expect(client.query.mock.calls[0][0]).toContain("p.status='PENDING_PAYMENT'")})
  it('releases an expired reservation and cancels its pending order',async()=>{const responses=[{rows:[{id:1,pedido_id:2,variante_id:3,quantidade:1,pedido_status:'PENDING_PAYMENT'}],rowCount:1},{rows:[{id:1}],rowCount:1},{rows:[{saldo:4}],rowCount:1},{rows:[],rowCount:1},{rows:[],rowCount:1},{rows:[],rowCount:1}];const client={query:vi.fn(async()=>responses.shift())};const repository=createOrderRepository(async(work)=>work(client));await expect(repository.expireReservations()).resolves.toEqual({expired:1});expect(client.query.mock.calls.some(([query])=>(query.text??query).includes("status='EXPIRED'"))).toBe(true);expect(client.query.mock.calls.some(([query])=>(query.text??query).includes("status='CANCELLED'"))).toBe(true)})
})
