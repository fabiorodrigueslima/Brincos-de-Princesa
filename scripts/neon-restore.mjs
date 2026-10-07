import fs from 'node:fs/promises';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createHash,randomBytes } from 'node:crypto';
import pg from 'pg';
import { inventory } from './database-transfer.mjs';
import { context,connect,privateFolder,root,identifier,pgCommand } from './neon-context.mjs';

async function main(){
  const {url}=await context();
  const hashes=JSON.parse(await fs.readFile(path.join(privateFolder,'SHA256.json'),'utf8'));
  for(const [file,expected]of Object.entries(hashes))if(createHash('sha256').update(await fs.readFile(path.join(privateFolder,file))).digest('hex')!==expected)throw Error('BACKUP_HASH_MISMATCH');
  const source=JSON.parse(await fs.readFile(path.join(privateFolder,'source-inventory.json'),'utf8'));
  const local=parseEnv(await fs.readFile(path.join(root,'backend/.env'),'utf8'));
  const origin=new URL(local.DATABASE_ADMIN_URL||local.TEST_DATABASE_ADMIN_URL);
  if(origin.hostname!=='localhost'||origin.port!=='5432')throw Error('WRONG_SOURCE');origin.pathname='/brinco_de_princesa';
  const sourceClient=new pg.Client({connectionString:origin.href});await sourceClient.connect();
  try{
    await sourceClient.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await sourceClient.query("SET LOCAL timezone='UTC'");
    const current=await inventory(sourceClient);
    for(const field of ['tables','sequences','migrations'])if(JSON.stringify(current[field])!==JSON.stringify(source[field]))throw Error('SOURCE_CHANGED_NEW_BACKUP_REQUIRED');
    await sourceClient.query('ROLLBACK');
  }finally{await sourceClient.end();}
  const admin=await connect(url);
  try{
    const objects=await admin.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%' AND c.relkind IN ('r','p','v','m','S')");
    if(objects.rows[0].n!==0)throw Error('TARGET_NOT_EMPTY');
    if((await admin.query("SELECT 1 FROM pg_namespace WHERE nspname='app'")).rowCount)throw Error('APP_SCHEMA_ALREADY_EXISTS');
    const roles=await admin.query("SELECT rolname FROM pg_roles WHERE rolname IN ('brinco_owner','brinco_app')");
    if(roles.rowCount)throw Error('TARGET_ROLES_EXIST_REVIEW_REQUIRED');
    const password=randomBytes(36).toString('base64url');
    const direct=new URL(url);direct.username='brinco_app';direct.password=password;
    const pooled=new URL(direct);pooled.hostname=pooled.hostname.replace(/^(ep-[^.]+)\./,'$1-pooler.');
    await fs.writeFile(path.join(privateFolder,'neon-runtime.env'),`DATABASE_URL=${pooled.href}\nDB_SSL=true\nDB_POOL_MAX=3\nDB_IDLE_TIMEOUT_MS=10000\nDB_CONNECTION_TIMEOUT_MS=3000\n`,{flag:'wx'});
    await fs.writeFile(path.join(privateFolder,'neon-release.env'),`DATABASE_URL=${pooled.href}\nDATABASE_ADMIN_URL=${url.href}\nDB_SSL=true\nALLOW_REMOTE_MIGRATION_DATABASE=true\nALLOW_DIFFERENT_DATABASE_ENDPOINTS=true\n`,{flag:'wx'});
    await admin.query('BEGIN');
    try{
      await admin.query('CREATE ROLE brinco_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS');
      // Password is random base64url, never interpolated from user input or logged.
      await admin.query(`CREATE ROLE brinco_app LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);
      await admin.query(`GRANT brinco_owner TO ${identifier(decodeURIComponent(url.username))}`);
      await admin.query(`GRANT CREATE ON DATABASE ${identifier(decodeURIComponent(url.pathname.slice(1)))} TO brinco_owner`);
      await admin.query('COMMIT');
    }catch(error){await admin.query('ROLLBACK');throw error;}
    console.log('New restricted roles created; credentials stored only in protected external files.');
    await admin.query('CREATE SCHEMA app AUTHORIZATION brinco_owner');
    const archive=Object.keys(hashes).find(file=>file.endsWith('.backup'));
    await pgCommand('pg_restore',['--no-password','--exit-on-error','--single-transaction','--schema=app','--no-owner','--role=brinco_owner','--dbname',decodeURIComponent(url.pathname.slice(1)),path.join(privateFolder,archive)],url);
    const database=identifier(decodeURIComponent(url.pathname.slice(1)));
    await admin.query(`REVOKE CREATE ON DATABASE ${database} FROM brinco_owner`);
    await admin.query(`REVOKE ALL ON DATABASE ${database} FROM PUBLIC`);
    await admin.query(`GRANT CONNECT ON DATABASE ${database} TO brinco_app`);
    await admin.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await admin.query(`ALTER ROLE brinco_app IN DATABASE ${database} SET search_path=app,public`);
    await admin.query(`ALTER ROLE brinco_app IN DATABASE ${database} SET statement_timeout='10s'`);
    await admin.query(`ALTER ROLE brinco_app IN DATABASE ${database} SET lock_timeout='3s'`);
    await fs.writeFile(path.join(privateFolder,'neon-restore-completed.json'),JSON.stringify({host:url.hostname,database:decodeURIComponent(url.pathname.slice(1)),archive,restoredAt:new Date().toISOString(),scope:'app',ownership:'brinco_owner',aclPreserved:true},null,2),{flag:'wx'});
    console.log('Archive restored transactionally; original local database unchanged.');
  }finally{await admin.end();}
}
main().catch(error=>{console.error({error:error.code||error.message||error.name});process.exitCode=1;});
