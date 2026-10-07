import pg from 'pg';
import { beforeAll,afterAll,describe,it,expect,vi } from 'vitest';
import { PostgresRateLimitStore } from '../src/security/postgresRateLimitStore.js';
import { createJobService } from '../src/services/jobService.js';
import { createOrderRepository } from '../src/repositories/orderRepository.js';
import { createPaymentRepository } from '../src/repositories/paymentRepository.js';
import { createDirectUploadService } from '../src/services/directUploadService.js';
import { createHash } from 'node:crypto';

let pool, runtimeOrder;
const query=(...args)=>pool.query(...args);
async function tx(work) {
  const client=await pool.connect();
  try {await client.query('BEGIN');const result=await work(client);await client.query('COMMIT');return result}
  catch(error){await client.query('ROLLBACK');throw error} finally{client.release()}
}
describe('shared serverless state with isolated PostgreSQL',()=>{
  beforeAll(async()=>{
    const url=process.env.TEST_DATABASE_URL;
    if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('Isolated database required');
    pool=new pg.Pool({connectionString:url,max:5});
    const admin=new pg.Client({connectionString:process.env.TEST_DATABASE_ADMIN_URL});await admin.connect();
    try {
      await admin.query("UPDATE app.configuracoes SET valor='true'::jsonb WHERE chave='checkout.enabled'");
      const customer=(await admin.query("INSERT INTO app.clientes(email,nome,sobrenome) VALUES('runtime-test@example.com','Runtime','Test') RETURNING id")).rows[0];
      const product=(await admin.query("INSERT INTO app.produtos(nome,slug,descricao,status) VALUES('Runtime','runtime-test','Test','ACTIVE') RETURNING id")).rows[0];
      const variant=(await admin.query("INSERT INTO app.produto_variantes(produto_id,nome,sku,preco,estoque,ativa) VALUES($1,'Test','runtime-test',100,3,true) RETURNING id",[product.id])).rows[0];
      const hash=value=>createHash('sha256').update(value).digest('hex');
      const value={keyHash:hash('runtime-key'),requestHash:hash('runtime-request'),publicCode:'BP-7200000000000001',accessToken:'runtime-token',accessTokenHash:hash('runtime-token'),customerId:customer.id,customer:{name:'Test',email:'runtime-test@example.com',phone:'11999999999'},address:{postalCode:'01001000',street:'Test',number:'1',neighborhood:'Test',city:'Test',state:'SP'},quote:{subtotal:'100.00',shipping:'10.00',total:'110.00',selectedShipping:{service:'Test',carrier:null,estimatedDays:7},items:[{variantId:Number(variant.id),quantity:1,unitPrice:'100.00',subtotal:'100.00'}]}};
      runtimeOrder=await createOrderRepository(tx).create(value);
    } finally {await admin.end()}
  });
  afterAll(async()=>{await pool?.end()});
  it('counts simultaneous requests across independent store instances',async()=>{
    const prefix=`test-${Date.now()}`;
    const a=new PostgresRateLimitStore(prefix,query),b=new PostgresRateLimitStore(prefix,query);
    a.init({windowMs:60000});b.init({windowMs:60000});
    const hits=await Promise.all(Array.from({length:20},(_,i)=>(i%2?a:b).increment('same-ip')));
    expect(hits.map(h=>h.totalHits).sort((x,y)=>x-y)).toEqual(Array.from({length:20},(_,i)=>i+1));
    await a.resetKey('same-ip');
  });
  it('allows only one email worker while a lease is active',async()=>{
    let unblock,started;
    const gate=new Promise(resolve=>{unblock=resolve});
    const ready=new Promise(resolve=>{started=resolve});
    const outbox={claim:vi.fn(async()=>{started();await gate;return []})};
    const a=createJobService({db:query,outbox}),b=createJobService({db:query,outbox});
    const first=a.run('send-emails');await ready;
    try{expect(await b.run('send-emails')).toEqual({skipped:true})}finally{unblock()}
    expect(await first).toEqual({sent:0,failed:0});expect(outbox.claim).toHaveBeenCalledTimes(1);
  });
  it('serializes payment initialization and replays only the matching attempt',async()=>{
    const order=(await query("SELECT p.codigo_publico,p.access_token_hash,p.total FROM app.pedidos p WHERE p.codigo_publico=$1",[runtimeOrder.code])).rows[0];
    expect(order).toBeTruthy();
    const repo=createPaymentRepository(tx),key=`runtime-${Date.now()}`;
    const input={code:order.codigo_publico,tokenHash:order.access_token_hash,provider:'sandbox',method:'PIX',amount:order.total,idempotencyKey:key};
    const results=await Promise.allSettled([repo.prepare(input),repo.prepare(input)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(results.find(r=>r.status==='rejected').reason.code).toBe('PAYMENT_INITIALIZATION_PENDING');
    const attempt=results.find(r=>r.status==='fulfilled').value;
    await repo.complete(attempt.id,{preferenceId:key,checkoutUrl:'https://checkout.example.com/one'});
    expect(await repo.prepare(input)).toMatchObject({replayed:true,checkoutUrl:'https://checkout.example.com/one'});
    await expect(repo.prepare({...input,method:'CARD'})).rejects.toMatchObject({code:'IDEMPOTENCY_KEY_REUSED'});
    const second=await repo.prepare({...input,idempotencyKey:key+'-2'});
    await repo.complete(second.id,{preferenceId:key+'-2',checkoutUrl:'https://checkout.example.com/two'});
    const event={provider:'sandbox',reference:input.code,paymentId:key+'-pay',attemptKey:key,eventId:key+'-declined',status:'DECLINED',type:'payment.updated',amount:order.total,currency:'BRL',payloadHash:createHash('sha256').update('test').digest('hex')};
    await repo.processWebhook(event);
    expect((await query('SELECT status FROM app.pedidos WHERE codigo_publico=$1',[input.code])).rows[0].status).toBe('PENDING_PAYMENT');
    const approved={...event,attemptKey:key+'-2',paymentId:key+'-pay-2',eventId:key+'-approved',status:'APPROVED'};
    const confirmations=await Promise.all([repo.processWebhook(approved),repo.processWebhook(approved)]);
    expect(confirmations).toContainEqual({approved:true});expect(confirmations).toContainEqual({duplicate:true});
    const count=await query("SELECT count(*)::int n FROM app.movimentos_estoque m JOIN app.pedidos p ON p.id=m.pedido_id WHERE p.codigo_publico=$1 AND m.tipo='SALE'",[input.code]);
    expect(count.rows[0].n).toBe(1);
    await expect(repo.processWebhook({...approved,eventId:key+'-second-receipt',paymentId:'different-id'})).resolves.toMatchObject({latePayment:true});
    await repo.processWebhook({...approved,eventId:key+'-refund-secondary',paymentId:'different-id',status:'REFUNDED'});
    await repo.processWebhook({...approved,eventId:key+'-chargeback-secondary',paymentId:'different-id',status:'CHARGEBACK'});
    expect((await query('SELECT status FROM app.pedidos WHERE codigo_publico=$1',[input.code])).rows[0].status).toBe('PAID');
  });
  it('registers a signed upload once under concurrent completion',async()=>{
    const product=(await query('SELECT id FROM app.produtos LIMIT 1')).rows[0];
    let signedId;
    const storage={signUpload: id=>{signedId='test/'+id;return {publicId:signedId,fields:{},uploadUrl:'https://api.cloudinary.com/test'}},inspect:async()=>({public_id:signedId,resource_type:'image',format:'png',bytes:12,secure_url:'https://res.cloudinary.com/test/image/upload/test.png'})};
    const service=createDirectUploadService({db:query,tx,storage});
    const intent=await service.prepare({productId:Number(product.id),mime:'image/png',bytes:12,alt:'Test image',primary:false});
    const [a,b]=await Promise.all([service.complete(intent.id),service.complete(intent.id)]);
    expect(a.id).toBe(b.id);
  });
});
