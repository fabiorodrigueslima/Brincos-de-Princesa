import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import pg from 'pg';
import { app } from '../../src/app.js';
import { closeDatabase } from '../../src/config/database.js';
import { hashPassword } from '../../src/security/password.js';
import { paymentProvider,createMercadoPagoProvider } from '../../src/providers/paymentProvider.js';
import { shippingProvider } from '../../src/providers/shippingProvider.js';
import { emailProvider } from '../../src/providers/emailProvider.js';
import { storageProvider } from '../../src/providers/storageProvider.js';
import { env } from '../../src/config/env.js';

for(const name of ['DATABASE_URL','TEST_DATABASE_ADMIN_URL']) {
  const url=new URL(process.env[name]);
  assert(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname.endsWith('_test'),'Only isolated local databases allowed');
}
// No external network: each provider transport is replaced before HTTP requests.
globalThis.fetch = ((nativeFetch)=> (url,...args)=> {
  assert(new URL(url).hostname==='127.0.0.1','External network forbidden in smoke test');
  return nativeFetch(url,...args);
})(globalThis.fetch);
let preference,assetId;
const sent=[];
const provider=createMercadoPagoProvider({config:env,fetchImpl:async(url,options)=>{
  if(url.endsWith('/checkout/preferences')) {
    preference=JSON.parse(options.body);
    return {ok:true,json:async()=>({id:'smoke-preference',init_point:'https://www.mercadopago.com.br/checkout/test'})};
  }
  return {ok:true,json:async()=>({id:123456,status:'approved',transaction_amount:120,currency_id:'BRL',external_reference:preference.external_reference,metadata:preference.metadata,date_last_updated:'2026-10-07T00:00:00Z'})};
}});
Object.assign(paymentProvider,provider);
shippingProvider.quote=async()=>[{id:'smoke',service:'Entrega teste',carrier:'Mock',price:'20.00',estimatedDays:3}];
emailProvider.send=async message=>sent.push(message);
emailProvider.sendPasswordReset=async message=>sent.push(message);
storageProvider.inspect=async id=>{assetId=id;return {public_id:id,resource_type:'image',format:'png',bytes:12,secure_url:'https://res.cloudinary.com/test/image/upload/smoke.png'}};
storageProvider.delete=async()=>{};
const admin=new pg.Client({connectionString:process.env.TEST_DATABASE_ADMIN_URL});
await admin.connect();
const server=app.listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
async function call(path,{body,method=body?'POST':'GET',cookie,csrf,headers={}}={}) {
  const response=await fetch(base+path,{method,headers:{Origin:env.PUBLIC_FRONTEND_URL,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...headers},body:body?JSON.stringify(body):undefined});
  const payload=await response.json().catch(()=>null);
  return {status:response.status,body:payload,cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
}
try {
  const password='Smoke test password 123!';
  await admin.query("INSERT INTO app.usuarios_admin(email,nome,password_hash,papel) VALUES('smoke-admin@example.com','Test',$1,'OWNER')",[await hashPassword(password)]);
  await admin.query("UPDATE app.configuracoes SET valor='true'::jsonb WHERE chave='checkout.enabled'");
  assert.equal((await call('/api/v1/ready')).status,200);
  const login=await call('/api/v1/admin/auth/login',{body:{email:'smoke-admin@example.com',password}});
  assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/Secure/);
  const auth={cookie:login.cookie,csrf:login.body.data.csrfToken};
  const product=await call('/api/v1/admin/products',{...auth,body:{name:'Smoke product',slug:'smoke-product',description:'Test',status:'ACTIVE',productionDays:0}});
  assert.equal(product.status,201);
  const variant=await call(`/api/v1/admin/products/${product.body.data.id}/variants`,{...auth,body:{name:'Test',sku:'smoke-product',price:'100.00',stock:3,active:true,attributes:{}}});
  assert.equal(variant.status,201);
  const customer=await call('/api/v1/customers/auth/register',{body:{name:'Smoke Customer',email:'smoke-customer@example.com',phone:'11999999999',password}});
  assert.equal(customer.status,201);
  const customerAuth={cookie:customer.cookie,csrf:customer.body.data.csrfToken};
  const items=[{variantId:Number(variant.body.data.id),quantity:1}];
  assert.equal((await call('/api/v1/cart/validate',{body:{items}})).status,200);
  const input={items,customer:{name:'Smoke Customer',email:'smoke-customer@example.com',phone:'11999999999'},address:{postalCode:'01001000',street:'Rua teste',number:'1',complement:'',neighborhood:'Centro',city:'São Paulo',state:'SP'},shippingOptionId:'smoke',expectedTotal:'120.00'};
  const quote=await call('/api/v1/checkout/quote',{...customerAuth,body:input});assert.equal(quote.status,200);assert.equal(quote.body.data.total,'120.00');
  assert.equal((await call('/api/v1/orders',{cookie:customer.cookie,body:input,headers:{'Idempotency-Key':'smoke-order-key-missing-csrf'}})).status,403);
  const order=await call('/api/v1/orders',{...customerAuth,body:input,headers:{'Idempotency-Key':'smoke-order-key-123456'}});assert.equal(order.status,201);
  const {code,accessToken}=order.body.data;
  const payment=await call(`/api/v1/orders/${code}/payments`,{body:{method:'PIX'},headers:{'X-Order-Token':accessToken,'Idempotency-Key':'smoke-payment-key-123456'}});assert.equal(payment.status,201);assert.equal(preference.shipments.cost,20);
  const ts=String(Math.floor(Date.now()/1000));
  const signature=createHmac('sha256',env.MERCADO_PAGO_WEBHOOK_SECRET).update(`id:123456;request-id:smoke-request;ts:${ts};`).digest('hex');
  const webhook=()=>call('/api/v1/webhooks/payments/mercado-pago?data.id=123456',{body:{data:{id:123456},action:'payment.updated'},headers:{'x-signature':`ts=${ts},v1=${signature}`,'x-request-id':'smoke-request'}});
  assert.equal((await webhook()).body.data.approved,true);assert.equal((await webhook()).body.data.duplicate,true);
  assert.equal((await call(`/api/v1/orders/${code}`,{headers:{'X-Order-Token':accessToken}})).body.data.status,'PAID');
  const signed=await call('/api/v1/admin/images/sign',{...auth,body:{productId:Number(product.body.data.id),mime:'image/png',bytes:12,alt:'Smoke image',primary:true}});assert.equal(signed.status,201);
  const image=await call('/api/v1/admin/images/complete',{...auth,body:{id:signed.body.data.id}});assert.equal(image.status,200);assert.equal(assetId,signed.body.data.publicId);
  const job=await call('/api/internal/jobs/send-emails',{headers:{Authorization:`Bearer ${env.CRON_SECRET}`}});assert.equal(job.status,200);assert(sent.some(item=>item.template==='payment-confirmed'));
  assert.equal((await call('/api/internal/jobs/expire-orders',{headers:{Authorization:`Bearer ${env.CRON_SECRET}`}})).status,200);
  assert.equal((await call('/api/v1/customers/auth/forgot',{body:{email:'smoke-customer@example.com'}})).status,202);
  console.log('PRODUCTION_SMOKE_PASSED');
} finally {
  await new Promise(resolve=>server.close(resolve));await closeDatabase();await admin.end();
}
