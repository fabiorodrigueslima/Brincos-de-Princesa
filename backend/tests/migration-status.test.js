import { describe,it,expect,vi } from 'vitest';
import { readMigrationStatus } from '../src/database/migrationStatus.js';
import { loadMigrations } from '../src/database/migrationRunner.js';
import { fileURLToPath } from 'node:url';
const directory=fileURLToPath(new URL('../../database/migrations/',import.meta.url));

describe('read-only migration status',()=>{
  it('reports all pending without creating the absent history table',async()=>{
    const client={query:vi.fn(async()=>({rows:[{relation:null}]}))};
    const status=await readMigrationStatus(client,directory);
    expect(status.pending).toBe(15);expect(status.valid).toBe(true);
    expect(client.query).toHaveBeenCalledTimes(1);
  });
  it('distinguishes applied files, pending files, tampering and missing source files',async()=>{
    const files=await loadMigrations(directory);
    const client={query:vi.fn().mockResolvedValueOnce({rows:[{relation:'app.schema_migrations'}]}).mockResolvedValueOnce({rows:[{version:1,name:files[0].name,checksum:files[0].checksum},{version:2,name:files[1].name,checksum:'bad'},{version:99,name:'missing',checksum:'bad'}]})};
    const status=await readMigrationStatus(client,directory);
    expect(status.valid).toBe(false);expect(status.pending).toBe(13);
    expect(status.migrations.map(row=>row.status)).toContain('CHECKSUM_MISMATCH');
    expect(status.migrations.at(-1).status).toBe('MISSING_FILE');
    expect(client.query.mock.calls.every(([sql])=>sql.startsWith('SELECT'))).toBe(true);
  });
});
