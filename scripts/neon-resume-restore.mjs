import fs from 'node:fs/promises';
import path from 'node:path';
import { context,connect,privateFolder,identifier,pgCommand } from './neon-context.mjs';

const {url}=await context();const admin=await connect(url);
try {
  const objects=await admin.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%' AND c.relkind IN ('r','p','v','m','S')");
  if(objects.rows[0].n!==0)throw Error('TARGET_NOT_EMPTY');
  const schema=await admin.query("SELECT pg_get_userbyid(nspowner) owner FROM pg_namespace WHERE nspname='app'");
  if(schema.rowCount&&schema.rows[0].owner!=='brinco_owner')throw Error('WRONG_SCHEMA_OWNER');
  if(!schema.rowCount)await admin.query('CREATE SCHEMA app AUTHORIZATION brinco_owner');
  await pgCommand('pg_restore',['--no-password','--exit-on-error','--single-transaction','--schema=app','--no-owner','--role=brinco_owner','--dbname',decodeURIComponent(url.pathname.slice(1)),path.join(privateFolder,'brinco_de_princesa_20261007_010534.backup')],url);
  const database=identifier(decodeURIComponent(url.pathname.slice(1)));
  await admin.query(`REVOKE CREATE ON DATABASE ${database} FROM brinco_owner`);
  await admin.query(`REVOKE ALL ON DATABASE ${database} FROM PUBLIC`);
  await admin.query(`GRANT CONNECT ON DATABASE ${database} TO brinco_app`);
  await admin.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await admin.query('GRANT USAGE ON SCHEMA app TO brinco_app');
  await admin.query(`ALTER ROLE brinco_app IN DATABASE ${database} SET search_path=app,public`);
  await admin.query(`ALTER ROLE brinco_app IN DATABASE ${database} SET statement_timeout='10s'`);
  await admin.query(`ALTER ROLE brinco_app IN DATABASE ${database} SET lock_timeout='3s'`);
  await fs.writeFile(path.join(privateFolder,'neon-restore-completed.json'),JSON.stringify({host:url.hostname,database:decodeURIComponent(url.pathname.slice(1)),restoredAt:new Date().toISOString(),scope:'app',ownership:'brinco_owner',aclPreserved:true},null,2),{flag:'wx'});
  console.log('RESTORE_COMPLETED');
}catch(error){console.error({error:error.code||error.message,diagnostic:error.diagnostic});process.exitCode=1;}
finally{await admin.end();}
