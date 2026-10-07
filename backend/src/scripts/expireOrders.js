import { closeDatabase } from '../config/database.js';
import { jobService } from '../services/jobService.js';
try {
  const result = await jobService.run('expire-orders');
  console.log(JSON.stringify({ event: 'JOB_COMPLETED', job: 'expire-orders', ...result }));
  if (result.failed) process.exitCode = 1;
} catch (error) { console.error({ event: 'JOB_FAILED', code: error.code ?? error.name }); process.exitCode = 1; }
finally { await closeDatabase(); }
