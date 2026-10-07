import pg from 'pg';
import { resolve } from 'node:path';
import { resolveAdminConnection } from '../database/adminConnection.js';
import { readMigrationStatus } from '../database/migrationStatus.js';

let client;
try {
  const {adminUrl}=resolveAdminConnection();
  client=new pg.Client({connectionString:adminUrl.toString(),connectionTimeoutMillis:5000});
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const status=await readMigrationStatus(client,resolve(import.meta.dirname,'../../../database/migrations'));
  await client.query('ROLLBACK');
  console.log(JSON.stringify({database:decodeURIComponent(adminUrl.pathname.slice(1)),...status},null,2));
  if(!status.valid)process.exitCode=1;
}catch(error){console.error({error:error.code??error.name});process.exitCode=1;}
finally{await client?.end();}
