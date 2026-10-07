import { loadMigrations } from './migrationRunner.js';

export async function readMigrationStatus(client,directory) {
  const files=await loadMigrations(directory);
  const exists=await client.query("SELECT to_regclass('app.schema_migrations') AS relation");
  const applied=exists.rows[0].relation?(await client.query('SELECT version,name,checksum FROM app.schema_migrations ORDER BY version')).rows:[];
  const migrations=files.map(file=>{
    const row=applied.find(item=>Number(item.version)===file.version);
    return {version:file.version,file:file.fileName,status:!row?'PENDING':row.name===file.name&&row.checksum.trim()===file.checksum?'APPLIED':'CHECKSUM_MISMATCH'};
  });
  for(const row of applied)if(!files.some(file=>file.version===Number(row.version)))migrations.push({version:Number(row.version),status:'MISSING_FILE'});
  return {migrations,pending:migrations.filter(row=>row.status==='PENDING').length,valid:migrations.every(row=>['APPLIED','PENDING'].includes(row.status))};
}
