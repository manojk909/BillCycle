import { prisma } from '../lib/prisma';
import { today } from '../lib/dates';
import {
  activateSubscription,
  closeSubscription,
} from '../modules/subscriptions/subscription-actions';

// SK5: daily lifecycle jobs. Each is independent and logs via the state machine.

/** CONFIRMED subscriptions whose startDate has arrived → ACTIVE (begins billing). */
export async function activateDue(): Promise<number> {
  const now = today();
  const due = await prisma.subscription.findMany({
    where: { state: 'CONFIRMED', startDate: { lte: now } },
    select: { id: true },
  });
  let activated = 0;
  for (const { id } of due) {
    try {
      await activateSubscription(id, 'system');
      activated += 1;
    } catch {
      // ignore individual failures; a bad row shouldn't stop the batch
    }
  }
  return activated;
}

/** Auto-close subscriptions on autoClose plans whose expiry has passed. */
export async function autoCloseExpired(): Promise<number> {
  const now = today();
  const expired = await prisma.subscription.findMany({
    where: {
      state: { in: ['ACTIVE', 'PAUSED'] },
      expiryDate: { lt: now },
      plan: { autoClose: true },
    },
    select: { id: true },
  });
  let closed = 0;
  for (const { id } of expired) {
    try {
      await closeSubscription(id, 'system', 'Expired');
      closed += 1;
    } catch {
      // ignore
    }
  }
  return closed;
}

/**
 * Flag quotations whose validity has passed. We don't have a dedicated EXPIRED
 * state, so this is reported as a count (the UI shows "expired" when
 * quotationValidUntil < today). Kept as a job hook for future hard-expiry.
 */
export async function expireQuotations(): Promise<number> {
  const now = today();
  return prisma.subscription.count({
    where: { state: 'QUOTATION', quotationValidUntil: { lt: now } },
  });
}
