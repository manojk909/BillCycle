import cron from 'node-cron';
import { env } from '../config/env';
import { today } from '../lib/dates';
import { runBilling } from './billing-run';
import { activateDue, autoCloseExpired, expireQuotations } from './lifecycle';

// SK5: the daily job. Order matters — activate first so newly-active subscriptions
// get billed in the same pass, then bill, then close expired, then flag quotations.
export async function runDailyJobs() {
  const activated = await activateDue();
  const billing = await runBilling({ upTo: today() });
  const closed = await autoCloseExpired();
  const expiredQuotations = await expireQuotations();
  return { activated, billing, closed, expiredQuotations };
}

let task: ReturnType<typeof cron.schedule> | null = null;

/** Starts the 01:00 daily scheduler when SCHEDULER_ENABLED=true. Idempotent. */
export function startScheduler() {
  if (!env.SCHEDULER_ENABLED) {
    console.log('[scheduler] disabled (set SCHEDULER_ENABLED=true to enable)');
    return;
  }
  if (task) return;
  task = cron.schedule('0 1 * * *', () => {
    runDailyJobs()
      .then((r) => console.log('[scheduler] daily jobs done:', JSON.stringify(r)))
      .catch((err) => console.error('[scheduler] daily jobs failed:', (err as Error).message));
  });
  console.log('[scheduler] enabled: daily at 01:00');
}

export function stopScheduler() {
  task?.stop();
  task = null;
}
