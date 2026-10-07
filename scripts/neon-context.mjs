import fs from 'node:fs/promises';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import { rootCertificates } from 'node:tls';
import pg from 'pg';

export const privateFolder='C:/backup-brinco/20261007_010534';
export const root=path.resolve(import.meta.dirname,'..');
export const bin='C:/Program Files/PostgreSQL/18/bin';
export const identifier=value=>'"'+value.replaceAll('"','""')+'"';
export async function context(){
  const values=parseEnv(await fs.readFile(path.join(privateFolder,'neon-connection.env'),'utf8'));
  let value=values.NEON_ADMIN_URL.trim();
  const wrapped=value.match(/^psql\s+['"]([^'"\r\n]+)['"]\s*$/i);if(wrapped)value=wrapped[1];
  const url=new URL(value);
  if(!url.hostname.endsWith('.sa-east-1.aws.neon.tech')||url.hostname.includes('-pooler'))throw Error('EXPECTED_SAO_PAULO_DIRECT_ENDPOINT');
  url.searchParams.set('sslmode','verify-full');url.searchParams.delete('uselibpqcompat');
  return {url,values};
}
export async function connect(url){
  const client=new pg.Client({connectionString:url.href,connectionTimeoutMillis:15000});await client.connect();
  if(!client.connection.stream.encrypted||!client.connection.stream.authorized){await client.end();throw Error('TLS_VERIFICATION_FAILED');}
  return client;
}
export async function pgCommand(tool,args,url){
  const ca=path.join(privateFolder,'public-ca-bundle.pem');
  await fs.writeFile(ca,rootCertificates.join('\n'));
  const env={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGSSLMODE:'verify-full',PGSSLROOTCERT:ca,PGCONNECT_TIMEOUT:'20'};
  return run(path.join(bin,tool+'.exe'),args,env);
}
export function run(executable,args,env){
  return new Promise((resolve,reject)=>{
    const child=spawn(executable,args,{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let output='',errors='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>errors+=data);
    child.on('error',()=>reject(Error('CHILD_PROCESS_START_FAILED')));
    child.on('close',code=>{if(code!==0){const error=Error('CHILD_PROCESS_FAILED_'+code);error.diagnostic=errors;for(const [key,value]of Object.entries(env))if(value&&/PASSWORD|TOKEN|SECRET|DATABASE.*URL/.test(key))error.diagnostic=error.diagnostic.replaceAll(value,'[REDACTED]');reject(error);return;}resolve({output,errors});});
  });
}
