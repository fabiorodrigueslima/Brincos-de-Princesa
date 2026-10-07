import fs from 'node:fs/promises';
import path from 'node:path';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
import pg from 'pg';
import { privateFolder } from './neon-context.mjs';

Object.assign(process.env,parseEnv(await fs.readFile(path.join(privateFolder,'neon-runtime.env'),'utf8')),{NODE_ENV:'test',VERCEL:'',DB_CONNECTION_TIMEOUT_MS:'3000'});
const pools=[];const OriginalPool=pg.Pool;
pg.Pool=class extends OriginalPool{constructor(...args){super(...args);pools.push(this);}};
const {query,closeDatabase}=await import('../backend/src/config/database.js');
try{
  await query('SELECT 1');assert.equal(pools.length,1);const pool=pools[0];
  const requests=Array.from({length:12},()=>query('SELECT pg_sleep(0.15)'));
  await new Promise(resolve=>setTimeout(resolve,100));
  const peak={connections:pool.totalCount,waiting:pool.waitingCount};
  await Promise.all(requests);assert.equal(pool.totalCount,3);assert(peak.connections<=3);
  const saturation=await Promise.allSettled(Array.from({length:4},()=>query('SELECT pg_sleep(4)')));
  assert.equal(saturation.filter(row=>row.status==='rejected').length,1);
  assert.equal((await query('SELECT 1 ok')).rows[0].ok,1);
  const roles=(await query("SELECT current_user,current_setting('search_path') search_path,current_setting('statement_timeout') statement_timeout,current_setting('lock_timeout') lock_timeout,has_schema_privilege(current_user,'app','CREATE') app_ddl,has_database_privilege(current_user,current_database(),'CREATE') db_ddl,has_database_privilege(current_user,current_database(),'TEMP') temp,pg_has_role(current_user,'brinco_owner','MEMBER') owner_member,pg_has_role(current_user,'neon_superuser','MEMBER') elevated_member")).rows[0];
  assert.equal(roles.current_user,'brinco_app');assert.equal(roles.statement_timeout,'10s');assert.equal(roles.lock_timeout,'3s');
  assert(!roles.app_ddl&&!roles.db_ddl&&!roles.temp&&!roles.owner_member&&!roles.elevated_member);
  await closeDatabase();assert(pool.ended);
  const report={pooledEndpoint:true,singletonPools:pools.length,max:3,peak,requests:12,saturationTimeout:true,recovered:true,closed:true,roles};
  await fs.writeFile(path.join(privateFolder,'neon-pool-proof.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){console.error({error:error.code||error.name});await closeDatabase().catch(()=>{});process.exitCode=1;}
