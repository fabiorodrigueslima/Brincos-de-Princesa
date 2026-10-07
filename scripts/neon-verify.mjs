import fs from 'node:fs/promises';
import path from 'node:path';
import { context,connect,privateFolder } from './neon-context.mjs';
import { inventory } from './database-transfer.mjs';
import { compareInventories } from './compare-database-inventories.mjs';

const {url}=await context();const client=await connect(url);
try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await client.query("SET LOCAL timezone='UTC'");
  const target=await inventory(client);await client.query('ROLLBACK');
  const source=JSON.parse(await fs.readFile(path.join(privateFolder,'source-inventory.json'),'utf8'));
  const onlyApp=value=>Object.fromEntries(Object.entries(value).map(([key,rows])=>[key,Array.isArray(rows)?rows.filter(row=>!('schema'in row)||row.schema==='app').filter(row=>!('table_schema'in row)||row.table_schema==='app').filter(row=>!('schemaname'in row)||row.schemaname==='app').filter(row=>!('nspname'in row)||row.nspname==='app'):rows]));
  const comparison=compareInventories(onlyApp(source),onlyApp(target));
  await fs.writeFile(path.join(privateFolder,'neon-restored-inventory.json'),JSON.stringify(target,null,2));
  await fs.writeFile(path.join(privateFolder,'neon-restore-comparison.json'),JSON.stringify(comparison,null,2));
  console.log(JSON.stringify({tables:target.tables.length,rows:target.tables.reduce((n,t)=>n+Number(t.count),0),sequences:target.sequences.length,comparison}));
  if(comparison.some(row=>!row.equal))process.exitCode=1;
}catch(error){console.error({error:error.code||error.name});process.exitCode=1;}
finally{await client.end();}
