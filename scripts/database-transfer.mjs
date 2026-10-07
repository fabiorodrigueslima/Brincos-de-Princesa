import fs from 'node:fs/promises';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { loadMigrations } from '../backend/src/database/migrationRunner.js';
import { compareInventories } from './compare-database-inventories.mjs';

const root = path.resolve(import.meta.dirname, '..');
const bin = process.env.PG_BIN || 'C:/Program Files/PostgreSQL/18/bin';
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const userSchemas = "n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp_%'";

export async function inventory(client) {
  const rows = async sql => (await client.query(sql)).rows;
  const result = {};
  result.database = (await rows("SELECT current_database() name,current_user,version(),pg_database_size(current_database()) bytes,current_setting('search_path') search_path,current_setting('statement_timeout') statement_timeout,current_setting('lock_timeout') lock_timeout"))[0];
  result.schemas = await rows(`SELECT n.nspname,pg_get_userbyid(n.nspowner) owner,n.nspacl::text acl FROM pg_namespace n WHERE ${userSchemas} ORDER BY 1`);
  result.objects = await rows(`SELECT n.nspname schema,c.relname name,c.relkind kind,pg_get_userbyid(c.relowner) owner,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${userSchemas} ORDER BY 1,2,3`);
  result.columns = await rows(`SELECT n.nspname schema,c.relname relation,a.attname name,a.attnum position,format_type(a.atttypid,a.atttypmod) type,a.attnotnull required,a.attidentity identity,a.attgenerated generated,pg_get_expr(d.adbin,d.adrelid) expression FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE ${userSchemas} AND c.relkind IN ('r','p','v','m','S') AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,4`);
  result.constraints = await rows(`SELECT n.nspname schema,c.relname relation,k.conname name,k.contype type,k.convalidated validated,pg_get_constraintdef(k.oid) definition FROM pg_constraint k JOIN pg_namespace n ON n.oid=k.connamespace LEFT JOIN pg_class c ON c.oid=k.conrelid WHERE ${userSchemas} ORDER BY 1,2,3`);
  result.indexes = await rows("SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2,3");
  result.functions = await rows(`SELECT n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) arguments,pg_get_functiondef(p.oid) definition,pg_get_userbyid(p.proowner) owner,p.proacl::text acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE ${userSchemas} AND p.prokind IN ('f','p') ORDER BY 1,2,3`);
  result.triggers = await rows(`SELECT n.nspname schema,c.relname relation,t.tgname name,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${userSchemas} AND NOT t.tgisinternal ORDER BY 1,2,3`);
  result.views = await rows("SELECT schemaname,viewname,definition FROM pg_views WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2");
  result.extensions = await rows('SELECT extname,extversion FROM pg_extension ORDER BY 1');
  result.roles = await rows("SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolconfig FROM pg_roles WHERE rolname IN ('brinco_owner','brinco_app',current_user) ORDER BY 1");
  result.roleSettings = await rows("SELECT r.rolname,d.datname,s.setconfig FROM pg_db_role_setting s LEFT JOIN pg_roles r ON r.oid=s.setrole LEFT JOIN pg_database d ON d.oid=s.setdatabase WHERE r.rolname IN ('brinco_app','brinco_owner') ORDER BY 1,2");
  result.memberships = await rows("SELECT r.rolname role,m.rolname member,a.admin_option FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid JOIN pg_roles m ON m.oid=a.member WHERE r.rolname IN ('brinco_owner','brinco_app') OR m.rolname IN ('brinco_owner','brinco_app') ORDER BY 1,2");
  result.defaultPrivileges = await rows("SELECT pg_get_userbyid(defaclrole) role,n.nspname schema,defaclobjtype type,defaclacl::text acl FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace ORDER BY 1,2,3");
  result.grants = await rows("SELECT table_schema,table_name,grantee,privilege_type,is_grantable FROM information_schema.table_privileges WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2,3,4");
  result.tables = [];
  for (const table of result.objects.filter(t => ['r','p'].includes(t.kind))) {
    const name = quote(table.schema)+'.'+quote(table.name);
    // Content never leaves PostgreSQL: compare deterministic row hashes, including duplicates.
    const [data] = await rows(`SELECT count(*)::text count,md5(COALESCE(string_agg(h,'' ORDER BY h COLLATE "C"),'')) digest FROM (SELECT md5(row_to_json(t)::text) h FROM ${name} t) q`);
    result.tables.push({schema:table.schema,name:table.name,...data});
  }
  result.sequences = [];
  for (const sequence of result.objects.filter(t => t.kind === 'S')) {
    const [state] = await rows(`SELECT last_value::text,is_called FROM ${quote(sequence.schema)}.${quote(sequence.name)}`);
    result.sequences.push({schema:sequence.schema,name:sequence.name,...state});
  }
  result.migrations = await rows('SELECT version,name,checksum FROM app.schema_migrations ORDER BY version');
  const files = await loadMigrations(path.join(root,'database/migrations'));
  result.migrationStatus = files.map(file => {
    const applied = result.migrations.find(row => Number(row.version) === file.version);
    return {version:file.version,file:file.fileName,status:!applied?'PENDING':applied.name===file.name&&applied.checksum.trim()===file.checksum?'APPLIED':'CHECKSUM_MISMATCH'};
  });
  return result;
}

async function command(name,args,url) {
  return new Promise((resolve,reject) => {
    const env={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGCONNECT_TIMEOUT:'10'};
    const child=spawn(path.join(bin,name+'.exe'),args,{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
    child.on('error',()=>reject(new Error('POSTGRES_TOOL_START_FAILED')));
    child.on('close',code=>code===0?resolve(out):reject(new Error(`${name}_FAILED_${code}_${err.replaceAll(decodeURIComponent(url.password),'[REDACTED]').slice(0,500)}`)));
  });
}

async function sourceUrl() {
  const env=parseEnv(await fs.readFile(path.join(root,'backend/.env'),'utf8'));
  const runtime=new URL(env.DATABASE_URL);
  const admin=new URL(env.DATABASE_ADMIN_URL||env.TEST_DATABASE_ADMIN_URL);
  if(!['localhost','127.0.0.1'].includes(admin.hostname)||admin.port!=='5432'||runtime.pathname!=='/brinco_de_princesa'||runtime.hostname!==admin.hostname)throw new Error('SOURCE_NOT_EXPECTED');
  admin.pathname=runtime.pathname;
  return admin;
}

async function main() {
  const [action,folder]=process.argv.slice(2);
  if(!folder||!path.isAbsolute(folder)||path.resolve(folder).startsWith(root))throw new Error('PRIVATE_EXTERNAL_FOLDER_REQUIRED');
  await fs.access(folder);
  if(action==='backup') {
    const url=await sourceUrl();const client=new pg.Client({connectionString:url.href,connectionTimeoutMillis:5000});
    try {
      await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await client.query("SET LOCAL timezone='UTC'");
      const snapshot=(await client.query('SELECT pg_export_snapshot() snapshot')).rows[0].snapshot;
      const data=await inventory(client);
      if(data.migrationStatus.some(m=>m.status==='CHECKSUM_MISMATCH'))throw new Error('MIGRATION_CHECKSUM_MISMATCH');
      await fs.writeFile(path.join(folder,'source-inventory.json'),JSON.stringify(data,null,2),{flag:'wx'});
      const base='brinco_de_princesa_'+path.basename(folder);
      for(const [suffix,options] of [['.backup',['-F','c']],['_schema.sql',['--schema-only']],['_data.sql',['--data-only']]]) {
        await command('pg_dump',['--no-password',`--snapshot=${snapshot}`,...options,'--file',path.join(folder,base+suffix)],url);
      }
      await client.query('COMMIT');
      const list=await command('pg_restore',['--list',path.join(folder,base+'.backup')],url);
      await fs.writeFile(path.join(folder,'archive-list.txt'),list,{flag:'wx'});
      const checksums={};for(const name of await fs.readdir(folder)){if((await fs.stat(path.join(folder,name))).isFile())checksums[name]=createHash('sha256').update(await fs.readFile(path.join(folder,name))).digest('hex');}
      await fs.writeFile(path.join(folder,'SHA256.json'),JSON.stringify(checksums,null,2),{flag:'wx'});
      console.log(JSON.stringify({backupFolder:folder,tables:data.tables.length,rows:data.tables.reduce((sum,t)=>sum+Number(t.count),0),sequences:data.sequences.length,pending:data.migrationStatus.filter(m=>m.status==='PENDING'),archiveVerified:list.includes('TABLE DATA')&&list.includes('SEQUENCE SET')&&list.includes('CONSTRAINT')&&list.includes('INDEX')}));
    } finally {await client.end();}
  } else if(action==='verify-restore') {
    const url=new URL(process.env.RESTORE_TEST_ADMIN_URL);
    if(url.hostname!=='127.0.0.1'||url.port!=='55440'||!url.pathname.startsWith('/bdp_restore_'))throw new Error('ISOLATED_RESTORE_ONLY');
    const checksums=JSON.parse(await fs.readFile(path.join(folder,'SHA256.json'),'utf8'));
    for(const [name,hash] of Object.entries(checksums))if(createHash('sha256').update(await fs.readFile(path.join(folder,name))).digest('hex')!==hash)throw new Error('BACKUP_HASH_MISMATCH');
    const archive=(await fs.readdir(folder)).find(n=>n.endsWith('.backup'));
    const guard=new pg.Client({connectionString:url.href});
    try {
      await guard.connect();
      const existing=await guard.query("SELECT count(*)::int count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND c.relkind IN ('r','p','v','m','S')");
      if(existing.rows[0].count!==0)throw new Error('RESTORE_TARGET_NOT_EMPTY');
    }finally{await guard.end();}
    await command('pg_restore',['--no-password','--exit-on-error','--single-transaction','--dbname',decodeURIComponent(url.pathname.slice(1)),path.join(folder,archive)],url);
    const client=new pg.Client({connectionString:url.href});
    try {
      await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await client.query("SET LOCAL timezone='UTC'");
      const target=await inventory(client);await client.query('ROLLBACK');
      const source=JSON.parse(await fs.readFile(path.join(folder,'source-inventory.json'),'utf8'));
      const comparison=compareInventories(source,target);
      await fs.writeFile(path.join(folder,'restored-inventory.json'),JSON.stringify(target,null,2),{flag:'wx'});
      await fs.writeFile(path.join(folder,'restore-comparison.json'),JSON.stringify(comparison,null,2),{flag:'wx'});
      console.log(JSON.stringify(comparison));
      if(comparison.some(row=>!row.equal))process.exitCode=1;
    }finally{await client.end();}
  }else throw new Error('UNKNOWN_ACTION');
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename))main().catch(error=>{console.error({error:error.message});process.exitCode=1;});
