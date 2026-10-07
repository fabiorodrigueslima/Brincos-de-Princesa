import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { inventory } from './database-transfer.mjs';

// This rehearsal cannot target the source database or an online database.
const url=new URL(process.env.DATABASE_URL);
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55440');assert.equal(url.pathname,'/bdp_restore_20261007');
const admin=new pg.Client({host:'127.0.0.1',port:55440,user:'postgres',database:'bdp_restore_20261007'});
const folder=process.argv[2];
await admin.connect();
try {
  await admin.query('REVOKE ALL ON DATABASE bdp_restore_20261007 FROM PUBLIC');
  await admin.query('GRANT CONNECT ON DATABASE bdp_restore_20261007 TO brinco_app');
  await admin.query('ALTER ROLE brinco_app IN DATABASE bdp_restore_20261007 SET search_path=app,public');
  await admin.query("ALTER ROLE brinco_app IN DATABASE bdp_restore_20261007 SET statement_timeout='10s'");
  await admin.query("ALTER ROLE brinco_app IN DATABASE bdp_restore_20261007 SET lock_timeout='3s'");
  await admin.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await admin.query("SET LOCAL timezone='UTC'");
  const after=await inventory(admin);await admin.query('ROLLBACK');
  const before=JSON.parse(await fs.readFile(path.join(folder,'source-inventory.json'),'utf8'));
  const comparison=before.tables.map(table=>{
    const actual=after.tables.find(row=>row.schema===table.schema&&row.name===table.name);
    const expectedMigrationChange=table.name==='schema_migrations';
    assert(actual);
    if(expectedMigrationChange)assert.equal(actual.count,'15');else assert.deepEqual(actual,table);
    return {table:table.name,before:table.count,after:actual.count,status:expectedMigrationChange?'EXPECTED_13_TO_15':'IDENTICAL_COUNT_AND_DIGEST'};
  });
  assert(after.migrationStatus.every(row=>row.status==='APPLIED'));
  await fs.writeFile(path.join(folder,'post-migration-comparison.json'),JSON.stringify(comparison,null,2));
  console.log(JSON.stringify({preservedOriginalTables:comparison.length,pendingMigrations:0,newTables:after.tables.length-before.tables.length}));
}finally{await admin.end();}

// Exercise the actual application singleton pool (3 clients), not a substitute.
process.env.NODE_ENV='test';process.env.DB_POOL_MAX='3';process.env.DB_CONNECTION_TIMEOUT_MS='500';process.env.DB_SSL='false';
const {query,closeDatabase}=await import('../backend/src/config/database.js');
try {
  const settings=(await query("SELECT current_user,current_setting('search_path') search_path,current_setting('statement_timeout') statement_timeout,current_setting('lock_timeout') lock_timeout,has_database_privilege(current_user,current_database(),'CREATE') create_database_objects,has_database_privilege(current_user,current_database(),'TEMP') temp,has_schema_privilege(current_user,'app','CREATE') app_ddl,has_schema_privilege(current_user,'public','CREATE') public_ddl")).rows[0];
  assert.equal(settings.current_user,'brinco_app');assert.equal(settings.statement_timeout,'10s');assert.equal(settings.lock_timeout,'3s');
  assert(!settings.create_database_objects&&!settings.temp&&!settings.app_ddl&&!settings.public_ddl);
  const results=await Promise.all(Array.from({length:12},()=>query('SELECT pg_backend_pid() pid,pg_sleep(0.03)')));
  const pids=new Set(results.map(result=>result.rows[0].pid));assert(pids.size<=3);
  const saturation=await Promise.allSettled(Array.from({length:4},()=>query('SELECT pg_sleep(0.9)')));
  assert.equal(saturation.filter(row=>row.status==='rejected').length,1);
  assert.equal((await query('SELECT 1 ok')).rows[0].ok,1);
  console.log(JSON.stringify({poolMax:3,distinctConnections:pids.size,queuedRequests:12,timeoutUnderSaturation:'PASS',recovery:'PASS',runtimeSettings:settings,onlinePooler:'NOT_TESTED'}));
}finally{await closeDatabase();}
