import type { Role, SubscriptionState } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { Tx } from '../../lib/prisma';
import { conflict, notFound, unprocessable } from '../../lib/http-error';
import { logActivity } from '../../lib/activity';
import { today, toDateOnly, addDays, daysBetween } from '../../lib/dates';

/**
 * SK2: subscription lifecycle.
 * These are SERVICE functions — M13 (portal) and SK5 (jobs) call them directly,
 * so no business logic lives in the controller.
 *
 * Actor is the user id, or 'system' for scheduler-driven transitions (auto-close).
 */
export type Actor = number | 'system';

export type SubscriptionAction =
  | 'send'
  | 'confirm'
  | 'activate'
  | 'pause'
  | 'resume'
  | 'renew'
  | 'close'
  | 'cancel';

// from-state -> action -> to-state. Single source of truth.
const TRANSITIONS: Record<SubscriptionState, Partial<Record<SubscriptionAction, SubscriptionState>>> = {
  DRAFT: { send: 'QUOTATION', confirm: 'CONFIRMED', cancel: 'CLOSED' },
  QUOTATION: { confirm: 'CONFIRMED', cancel: 'CLOSED' },
  CONFIRMED: { activate: 'ACTIVE' },
  ACTIVE: { pause: 'PAUSED', renew: 'ACTIVE', close: 'CLOSED' },
  PAUSED: { resume: 'ACTIVE', renew: 'PAUSED', close: 'CLOSED' },
  CLOSED: {},
};

const ACTION_LABEL: Record<SubscriptionAction, string> = {
  send: 'sent as quotation',
  confirm: 'confirmed',
  activate: 'activated',
  pause: 'paused',
  resume: 'resumed',
  renew: 'renewed',
  close: 'closed',
  cancel: 'cancelled',
};

export function assertTransition(from: SubscriptionState, action: SubscriptionAction): SubscriptionState {
  const to = TRANSITIONS[from]?.[action];
  if (!to) {
    throw conflict(
      `Cannot ${action} a subscription that is ${from.toLowerCase()}`,
      'INVALID_TRANSITION',
    );
  }
  return to;
}

type PlanFlags = { pausable: boolean; closable: boolean; renewable: boolean };

/** TODO(S5): replace with S5 `assertPlanAllows(plan, action)`. */
function assertPlanAllows(plan: PlanFlags, action: 'pause' | 'close' | 'renew', actor: Actor) {
  const flag = action === 'pause' ? plan.pausable : action === 'renew' ? plan.renewable : plan.closable;
  // System auto-close may close regardless of the closable flag (expiry enforcement).
  if (action === 'close' && actor === 'system') return;
  if (!flag) {
    throw unprocessable(`This plan does not allow ${action}`, undefined, 'PLAN_ACTION_NOT_ALLOWED');
  }
}

/** Buttons the UI should show, given the subscription, its plan flags and the viewer role. */
export function getAllowedActions(
  sub: { state: SubscriptionState },
  plan: PlanFlags,
  _role: Role,
): SubscriptionAction[] {
  const actions = Object.keys(TRANSITIONS[sub.state] ?? {}) as SubscriptionAction[];
  return actions.filter((a) => {
    if (a === 'pause') return plan.pausable;
    if (a === 'renew') return plan.renewable;
    if (a === 'close') return plan.closable;
    return true;
  });
}

const userId = (actor: Actor): number | null => (actor === 'system' ? null : actor);

async function loadForTransition(tx: Tx, id: number) {
  const sub = await tx.subscription.findUnique({ where: { id }, include: { plan: true } });
  if (!sub) throw notFound('Subscription');
  return sub;
}

async function record(
  tx: Tx,
  id: number,
  action: SubscriptionAction,
  to: SubscriptionState,
  actor: Actor,
  extra: Record<string, unknown> = {},
  note?: string,
) {
  const updated = await tx.subscription.update({
    where: { id },
    data: { state: to, ...extra },
    include: { plan: true },
  });
  await logActivity(tx, {
    entityType: 'subscription',
    entityId: id,
    action,
    message: `Subscription ${updated.number ?? id} ${ACTION_LABEL[action]}${note ? ` (${note})` : ''}`,
    userId: userId(actor),
  });
  return updated;
}

export function sendQuotation(id: number, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadForTransition(tx, id);
    const to = assertTransition(sub.state, 'send');
    const lines = await tx.subscriptionLine.findMany({ where: { subscriptionId: id } });
    if (!lines.some((l) => l.isPlanLine)) {
      throw unprocessable('Add a plan line before sending the quotation');
    }
    if (sub.quantity < sub.plan.minQuantity) {
      throw unprocessable(`Minimum quantity for this plan is ${sub.plan.minQuantity}`, {
        quantity: `Minimum quantity for this plan is ${sub.plan.minQuantity}`,
      });
    }
    const validUntil = sub.quotationValidUntil ?? addDays(today(), 30);
    return record(tx, id, 'send', to, actor, { quotationValidUntil: validUntil });
  });
}

export function confirmSubscription(id: number, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadForTransition(tx, id);
    const to = assertTransition(sub.state, 'confirm');
    if (sub.quotationValidUntil && toDateOnly(sub.quotationValidUntil) < today()) {
      throw conflict('This quotation has expired and can no longer be confirmed', 'QUOTATION_EXPIRED');
    }
    await record(tx, id, 'confirm', to, actor);
    // If it should already be running, activate immediately.
    if (toDateOnly(sub.startDate) <= today()) {
      return activateInTx(tx, id, actor);
    }
    return tx.subscription.findUniqueOrThrow({ where: { id }, include: { plan: true } });
  });
}

async function activateInTx(tx: Tx, id: number, actor: Actor) {
  const sub = await loadForTransition(tx, id);
  const to = assertTransition(sub.state, 'activate');
  return record(tx, id, 'activate', to, actor, { nextInvoiceDate: toDateOnly(sub.startDate) });
}

export function activateSubscription(id: number, actor: Actor) {
  return prisma.$transaction((tx) => activateInTx(tx, id, actor));
}

export function pauseSubscription(id: number, actor: Actor, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadForTransition(tx, id);
    const to = assertTransition(sub.state, 'pause');
    assertPlanAllows(sub.plan, 'pause', actor);
    return record(tx, id, 'pause', to, actor, { pausedAt: new Date() }, reason);
  });
}

export function resumeSubscription(id: number, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadForTransition(tx, id);
    const to = assertTransition(sub.state, 'resume');
    const next = sub.nextInvoiceDate
      ? new Date(Math.max(toDateOnly(sub.nextInvoiceDate).getTime(), today().getTime()))
      : today();
    return record(tx, id, 'resume', to, actor, { pausedAt: null, nextInvoiceDate: next });
  });
}

export function renewSubscription(id: number, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadForTransition(tx, id);
    const to = assertTransition(sub.state, 'renew');
    assertPlanAllows(sub.plan, 'renew', actor);
    // Extend expiry by the current term length (expiry - start).
    let expiryDate = sub.expiryDate;
    if (sub.expiryDate) {
      const termDays = daysBetween(sub.startDate, sub.expiryDate);
      expiryDate = addDays(sub.expiryDate, termDays);
    }
    return record(tx, id, 'renew', to, actor, { expiryDate }, 'term extended');
  });
}

export function closeSubscription(id: number, actor: Actor, reason: string) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadForTransition(tx, id);
    const to = assertTransition(sub.state, 'close');
    assertPlanAllows(sub.plan, 'close', actor);
    return record(
      tx,
      id,
      'close',
      to,
      actor,
      { closedAt: new Date(), closeReason: reason, nextInvoiceDate: null },
      reason,
    );
  });
}

export function cancelSubscription(id: number, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadForTransition(tx, id);
    const to = assertTransition(sub.state, 'cancel');
    return record(
      tx,
      id,
      'cancel',
      to,
      actor,
      { closedAt: new Date(), closeReason: 'Cancelled' },
      'Cancelled',
    );
  });
}

export const ACTION_HANDLERS: Record<
  SubscriptionAction,
  (id: number, actor: Actor, reason?: string) => Promise<unknown>
> = {
  send: (id, actor) => sendQuotation(id, actor),
  confirm: (id, actor) => confirmSubscription(id, actor),
  activate: (id, actor) => activateSubscription(id, actor),
  pause: (id, actor, reason) => pauseSubscription(id, actor, reason),
  resume: (id, actor) => resumeSubscription(id, actor),
  renew: (id, actor) => renewSubscription(id, actor),
  close: (id, actor, reason) => closeSubscription(id, actor, reason ?? 'Closed'),
  cancel: (id, actor) => cancelSubscription(id, actor),
};

export { TRANSITIONS };
