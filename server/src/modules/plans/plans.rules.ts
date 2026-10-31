import { unprocessable } from '../../lib/http-error';
import { toDateOnly } from '../../lib/dates';

// Pure plan rules, kept free of Prisma so they are cheap to unit test. Re-exported from plans.service.ts.

export type PlanWindow = { startDate: Date | null; endDate: Date | null; isActive?: boolean };

export type PlanAction = 'pause' | 'close' | 'renew';

export type PlanBehaviour = { name: string; pausable: boolean; closable: boolean; renewable: boolean };

/** True when `date` falls inside [startDate, endDate], both inclusive; a null bound is open. Archived plans are never available. */
export function isPlanAvailable(plan: PlanWindow, date: Date | string): boolean {
  if (plan.isActive === false) return false;
  const day = toDateOnly(date).getTime();
  if (plan.startDate && day < toDateOnly(plan.startDate).getTime()) return false;
  if (plan.endDate && day > toDateOnly(plan.endDate).getTime()) return false;
  return true;
}

const ACTION_FLAG: Record<PlanAction, { flag: keyof Omit<PlanBehaviour, 'name'>; verb: string }> = {
  pause: { flag: 'pausable', verb: 'paused' },
  close: { flag: 'closable', verb: 'closed early' },
  renew: { flag: 'renewable', verb: 'renewed' },
};

/** Throws 422 PLAN_ACTION_NOT_ALLOWED when the plan's options forbid the action on its subscriptions. */
export function assertPlanAllows(plan: PlanBehaviour, action: PlanAction): void {
  const { flag, verb } = ACTION_FLAG[action];
  if (!plan[flag]) {
    throw unprocessable(
      `Subscriptions on the "${plan.name}" plan can't be ${verb}`,
      undefined,
      'PLAN_ACTION_NOT_ALLOWED',
    );
  }
}
