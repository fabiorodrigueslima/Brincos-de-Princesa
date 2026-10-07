import { closeDatabase } from '../config/database.js';
import { jobService } from '../services/jobService.js';
try {
  const result = await jobService.run('send-emails');
  console.log(JSON.stringify({ event: 'JOB_COMPLETED', job: 'send-emails', ...result }));
  if (result.failed) process.exitCode = 1;
} catch (error) { console.error({ event: 'JOB_FAILED', code: error.code ?? error.name }); process.exitCode = 1; }
finally { await closeDatabase(); }
