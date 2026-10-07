import { Router } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { jobService } from '../services/jobService.js';

export function createJobRouter({ secret = env.CRON_SECRET, jobs = jobService } = {}) {
  const router = Router();
  router.use((req,res,next) => {
    res.setHeader('Cache-Control','no-store');
    const hash = value => createHash('sha256').update(value).digest();
    if (!secret || !timingSafeEqual(hash(req.get('authorization') ?? ''), hash(`Bearer ${secret}`))) return res.status(401).json({ error: { code: 'CRON_UNAUTHORIZED' } });
    next();
  });
  for (const name of ['expire-orders','send-emails']) router.get(`/${name}`, async (_req,res) => {
    const result = await jobs.run(name);
    console.log(JSON.stringify({ event: 'JOB_COMPLETED', job: name, ...result }));
    res.status(result.failed ? 503 : 200).json({ data: result });
  });
  return router;
}
