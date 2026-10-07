import { createHmac, createHash } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createMercadoPagoProvider } from '../src/providers/paymentProvider.js';
import { createCloudinaryStorageProvider } from '../src/providers/storageProvider.js';
import { createHttpEmailProvider } from '../src/providers/emailProvider.js';
import { createPaymentService } from '../src/services/paymentService.js';
import { createJobRouter } from '../src/routes/jobRoutes.js';
import { createJobService } from '../src/services/jobService.js';
import { toCents } from '../src/utils/money.js';

const config = { MERCADO_PAGO_API_URL:'https://api.example.com',MERCADO_PAGO_ACCESS_TOKEN:'test-only',MERCADO_PAGO_WEBHOOK_SECRET:'test-secret-not-real',PUBLIC_FRONTEND_URL:'https://shop.example.com',PUBLIC_BACKEND_URL:'https://shop.example.com',EXTERNAL_REQUEST_TIMEOUT_MS:1000 };
const response = body => ({ok:true,json:async()=>body});
describe('production integration contracts',()=>{
  it.each([['20.00','120.00'],['0.00','100.00']])('includes shipping %s in the authoritative total',async(shipping,amount)=>{
    const fetchImpl=vi.fn(async()=>response({id:'pref',init_point:'https://checkout.example.com'}));
    await createMercadoPagoProvider({config,fetchImpl}).createPayment({reference:'BP-TEST',amount,shipping,items:[{quantity:2,unitPrice:'33.33'},{quantity:1,unitPrice:'33.34'}],idempotencyKey:'test-key'});
    const body=JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.items.reduce((sum,item)=>sum+toCents(item.unit_price)*item.quantity,0)+toCents(body.shipments.cost)).toBe(toCents(amount));
    expect(body.metadata.payment_attempt).toBe('test-key');
  });
  it('rejects mismatched amounts before contacting the provider',async()=>{
    const fetchImpl=vi.fn();
    await expect(createMercadoPagoProvider({config,fetchImpl}).createPayment({amount:'1.00',shipping:'0.00',items:[{quantity:1,unitPrice:'2.00'}]})).rejects.toMatchObject({code:'PAYMENT_AMOUNT_INVALID'});
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(()=>toCents('0.001')).toThrow('INVALID_MONEY');
  });
  const sign=(ts='1704908010')=>`ts=${ts},v1=${createHmac('sha256',config.MERCADO_PAGO_WEBHOOK_SECRET).update(`id:123;request-id:request-1;ts:${ts};`).digest('hex')}`;
  it.each([undefined,'invalid',sign('1704900000')])('rejects missing, forged or stale signatures',async(signature)=>{
    const fetchImpl=vi.fn();
    await expect(createMercadoPagoProvider({config,fetchImpl,now:()=>1704908010000}).verifyWebhook({signature,requestId:'request-1',dataId:'123',payload:{}})).rejects.toMatchObject({code:'INVALID_WEBHOOK_SIGNATURE'});
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('rejects inconsistent payload and nonexistent payment',async()=>{
    const fetchImpl=vi.fn(async()=>({ok:false,status:404,json:async()=>({})}));
    const provider=createMercadoPagoProvider({config,fetchImpl,now:()=>1704908010000});
    await expect(provider.verifyWebhook({signature:sign(),requestId:'request-1',dataId:'123',payload:{data:{id:456}}})).rejects.toMatchObject({code:'INVALID_WEBHOOK_PAYLOAD'});
    await expect(provider.verifyWebhook({signature:sign(),requestId:'request-1',dataId:'123',payload:{}})).rejects.toMatchObject({code:'PAYMENT_LOOKUP_FAILED'});
  });
  it('replays a stored preference without another external call',async()=>{
    const provider={name:'mercado-pago',createPayment:vi.fn()};
    const repository={prepare:vi.fn(async()=>({replayed:true,checkoutUrl:'https://checkout.example.com'}))};
    const result=await createPaymentService({provider,repository,orders:{get:async()=>({status:'PENDING_PAYMENT',total:'120.00'})}}).create({code:'BP-X',token:'test',method:'PIX',idempotencyKey:'1234567890abcdef'});
    expect(result.replayed).toBe(true);expect(provider.createPayment).not.toHaveBeenCalled();
  });
  it('marks ambiguous provider failures instead of blindly retrying',async()=>{
    const repository={prepare:vi.fn(async()=>({id:1})),uncertain:vi.fn()};
    const provider={name:'mercado-pago',createPayment:vi.fn(async()=>{throw new Error('timeout')})};
    await expect(createPaymentService({provider,repository,orders:{get:async()=>({status:'PENDING_PAYMENT',total:'120.00'})}}).create({code:'BP-X',token:'test',method:'PIX',idempotencyKey:'1234567890abcdef'})).rejects.toThrow('timeout');
    expect(repository.uncertain).toHaveBeenCalledWith(1);
  });
  it('signs all Cloudinary delete parameters and keeps upload secret server-side',async()=>{
    const fetchImpl=vi.fn(async()=>response({result:'ok'}));
    const storage=createCloudinaryStorageProvider({config:{CLOUDINARY_FOLDER:'products',CLOUDINARY_CLOUD_NAME:'test',CLOUDINARY_API_KEY:'key',CLOUDINARY_API_SECRET:'secret',EXTERNAL_REQUEST_TIMEOUT_MS:1000},now:()=>123,fetchImpl});
    await storage.delete('products/image');
    expect(fetchImpl.mock.calls[0][1].body.get('signature')).toBe(createHash('sha1').update('invalidate=true&public_id=products/image&timestamp=123secret').digest('hex'));
    const upload=storage.signUpload('id');expect(upload.fields.overwrite).toBe(false);expect(upload.fields.allowed_formats).toBe('jpg,png,webp');expect(JSON.stringify(upload)).not.toContain('secret');
  });
  it.each(['order-received','payment-confirmed','password-reset','account-activation'])('sends the %s template with a stable idempotency key',async(template)=>{
    const fetchImpl=vi.fn(async()=>response({}));
    await createHttpEmailProvider({config:{EMAIL_WEBHOOK_URL:'https://mail.example.com',EMAIL_WEBHOOK_TOKEN:'test',EXTERNAL_REQUEST_TIMEOUT_MS:1000},fetchImpl}).send({template,to:'test@example.com',variables:{},idempotencyKey:'event-1'});
    expect(fetchImpl.mock.calls[0][1].headers['Idempotency-Key']).toBe('event-1');
  });
  it('authenticates cron independently of user cookies',async()=>{
    const jobs={run:vi.fn(async()=>({sent:1,failed:0}))};const app=express();app.use(createJobRouter({secret:'test-cron',jobs}));
    expect((await request(app).get('/send-emails')).status).toBe(401);
    expect((await request(app).get('/send-emails').set('Authorization','Bearer wrong')).status).toBe(401);
    expect(jobs.run).not.toHaveBeenCalled();
    expect((await request(app).get('/send-emails').set('Authorization','Bearer test-cron')).status).toBe(200);
  });
  it('does not execute a job whose distributed lease is held',async()=>{
    const outbox={claim:vi.fn()};expect(await createJobService({db:async()=>({rowCount:0}),outbox}).run('send-emails')).toEqual({skipped:true});expect(outbox.claim).not.toHaveBeenCalled();
  });
  it('records provider failures in the outbox and releases the lease',async()=>{
    const db=vi.fn(async()=>({rowCount:1}));const outbox={claim:async()=>[{id:1,event_key:'event',template:'order-received',recipient:'test@example.com',variables:{}}],failed:vi.fn(),sent:vi.fn()};
    expect(await createJobService({db,outbox,email:{send:async()=>{throw new Error('unavailable')}}}).run('send-emails')).toEqual({sent:0,failed:1});expect(outbox.failed).toHaveBeenCalled();expect(outbox.sent).not.toHaveBeenCalled();expect(db.mock.calls.at(-1)[0]).toContain('DELETE FROM app.job_leases');
  });
});
