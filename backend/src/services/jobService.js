import { directUploadService } from './directUploadService.js';
import { randomUUID } from 'node:crypto';
import { query } from '../config/database.js';
import { emailProvider } from '../providers/emailProvider.js';
import { emailOutboxRepository } from '../repositories/emailOutboxRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';

export function createJobService({ db = query, email = emailProvider, outbox = emailOutboxRepository, orders = orderRepository } = {}) {
  return {
    async run(name) {
      if (!['expire-orders', 'send-emails'].includes(name)) throw new Error('UNKNOWN_JOB');
      const owner = randomUUID();
      const lease = await db(`INSERT INTO app.job_leases(name,owner,expires_at) VALUES($1,$2,now()+interval '10 minutes')
        ON CONFLICT(name) DO UPDATE SET owner=EXCLUDED.owner,expires_at=EXCLUDED.expires_at
        WHERE app.job_leases.expires_at<now() RETURNING owner`, [name,owner]);
      if (!lease.rowCount) return { skipped: true };
      try {
        if (name === 'expire-orders') {
          const result = await orders.expireReservations();
          await db('DELETE FROM app.rate_limits WHERE expires_at<now()');
          await directUploadService.cleanup();
          return result;
        }
        let sent = 0, failed = 0;
        for (const message of await outbox.claim()) {
          try {
            await email.send({ template: message.template, to: message.recipient, variables: message.variables, idempotencyKey: message.event_key });
            await outbox.sent(message.id);
            sent++;
          } catch (error) {
            await outbox.failed(message.id, error.code ?? error.name);
            failed++;
          }
        }
        return { sent, failed };
      } finally {
        await db('DELETE FROM app.job_leases WHERE name=$1 AND owner=$2', [name,owner]);
      }
    },
  };
}
export const jobService = createJobService();
