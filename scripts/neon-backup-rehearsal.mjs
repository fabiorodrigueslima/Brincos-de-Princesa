import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { context,connect,privateFolder,identifier,pgCommand } from './neon-context.mjs';
import { inventory } from './database-transfer.mjs';
import { compareInventories } from './compare-database-inventories.mjs';

const {url}=await context();const admin=await connect(url);
const archive=path.join(privateFolder,'neon-online-20261007.backup');
const testDatabase='bdp_neon_smoke_20261007';
try{
  await admin.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await admin.query("SET LOCAL timezone='UTC'");
  const source=await inventory(admin);
  const original=JSON.parse(await fs.readFile(path.join(privateFolder,'source-inventory.json'),'utf8'));
  for(const table of original.tables){const actual=source.tables.find(row=>row.schema===table.schema&&row.name===table.name);if(table.name==='schema_migrations'){if(actual?.count!=='15')throw Error('MIGRATION_COUNT_INVALID');}else if(JSON.stringify(actual)!==JSON.stringify(table))throw Error('DATA_CHANGED_AFTER_MIGRATION');}
  if(source.migrationStatus.some(row=>row.status!=='APPLIED'))throw Error('MIGRATION_STATUS_INVALID');
  const snapshot=(await admin.query('SELECT pg_export_snapshot() snapshot')).rows[0].snapshot;
  await fs.writeFile(path.join(privateFolder,'neon-post-migration-inventory.json'),JSON.stringify(source,null,2),{flag:'wx'});
  await pgCommand('pg_dump',['--no-password','-F','c',`--snapshot=${snapshot}`,'--file',archive],url);
  await admin.query('COMMIT');
  const list=await pgCommand('pg_restore',['--list',archive],url);
  await fs.writeFile(path.join(privateFolder,'neon-online-archive-list.txt'),list.output);
  const hash=createHash('sha256').update(await fs.readFile(archive)).digest('hex');
  await fs.writeFile(path.join(privateFolder,'neon-online-sha256.json'),JSON.stringify({archive:path.basename(archive),sha256:hash},null,2));
  if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[testDatabase])).rowCount)throw Error('SMOKE_DATABASE_ALREADY_EXISTS');
  await admin.query(`CREATE DATABASE ${identifier(testDatabase)} OWNER brinco_owner TEMPLATE template0`);
  const cloneUrl=new URL(url);cloneUrl.pathname='/'+testDatabase;
  const clone=await connect(cloneUrl);
  try{
    await clone.query('CREATE SCHEMA app AUTHORIZATION brinco_owner');
    await pgCommand('pg_restore',['--no-password','--exit-on-error','--single-transaction','--schema=app','--no-owner','--role=brinco_owner','--dbname',testDatabase,archive],cloneUrl);
    await clone.query('GRANT USAGE ON SCHEMA app TO brinco_app');
    await clone.query(`REVOKE ALL ON DATABASE ${identifier(testDatabase)} FROM PUBLIC`);
    await clone.query(`GRANT CONNECT ON DATABASE ${identifier(testDatabase)} TO brinco_app`);
    await clone.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await clone.query(`ALTER ROLE brinco_app IN DATABASE ${identifier(testDatabase)} SET search_path=app,public`);
    await clone.query(`ALTER ROLE brinco_app IN DATABASE ${identifier(testDatabase)} SET statement_timeout='10s'`);
    await clone.query(`ALTER ROLE brinco_app IN DATABASE ${identifier(testDatabase)} SET lock_timeout='3s'`);
    await clone.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await clone.query("SET LOCAL timezone='UTC'");
    const restored=await inventory(clone);await clone.query('ROLLBACK');
    const fields=['objects','columns','constraints','indexes','functions','triggers','tables','sequences','migrations','grants','defaultPrivileges'];
    // Provider-owned PUBLIC defaults are not application objects and are not restored.
    const appDefaults=value=>({...value,defaultPrivileges:value.defaultPrivileges.filter(row=>row.schema==='app')});
    const comparison=compareInventories(appDefaults(source),appDefaults(restored)).filter(row=>fields.includes(row.field));
    await fs.writeFile(path.join(privateFolder,'neon-online-backup-restore-proof.json'),JSON.stringify({sha256:hash,database:testDatabase,comparison},null,2));
    if(comparison.some(row=>!row.equal))throw Error('ONLINE_BACKUP_RESTORE_MISMATCH');
    console.log(JSON.stringify({onlineTables:source.tables.length,onlineRows:source.tables.reduce((n,t)=>n+Number(t.count),0),originalDataPreserved:true,backupValidatedByRestore:true,smokeDatabase:testDatabase,sha256:hash}));
  }finally{await clone.end();}
}catch(error){console.error({error:error.code||error.message,diagnostic:error.diagnostic});process.exitCode=1;}
finally{await admin.end();}
