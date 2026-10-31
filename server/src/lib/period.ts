export type BillingPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function assertValidInterval(interval: number): void {
  if (!Number.isInteger(interval) || interval < 1) {
    throw new Error(`interval must be an integer >= 1, got ${interval}`);
  }
}

/** Normalizes to a UTC date-only Date (00:00:00Z), without mutating the input. */
function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function addMonths(date: Date, months: number, anchorDay: number): Date {
  const totalMonthIndex = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const targetYear = Math.floor(totalMonthIndex / 12);
  const targetMonth = ((totalMonthIndex % 12) + 12) % 12;
  const day = Math.min(anchorDay, daysInMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, day));
}

/** Start of the next period. anchorDay = day-of-month of the original start (keeps Jan 31 → Feb 28 → Mar 31). */
export function addPeriod(date: Date, period: BillingPeriod, interval = 1, anchorDay?: number): Date {
  assertValidInterval(interval);
  const start = dateOnly(date);
  const anchor = anchorDay ?? start.getUTCDate();

  switch (period) {
    case 'DAILY':
      return addDays(start, interval);
    case 'WEEKLY':
      return addDays(start, 7 * interval);
    case 'MONTHLY':
      return addMonths(start, interval, anchor);
    case 'YEARLY':
      return addMonths(start, 12 * interval, anchor);
    default:
      throw new Error(`Unknown billing period: ${period as string}`);
  }
}

/** Last day (inclusive) of the period that starts on `start`. = addPeriod(start) − 1 day */
export function periodEnd(start: Date, period: BillingPeriod, interval = 1, anchorDay?: number): Date {
  const next = addPeriod(start, period, interval, anchorDay);
  return addDays(next, -1);
}

/** All period starts from `from` (inclusive) while start <= `upTo`. Used for catch-up billing. */
export function periodStartsUntil(
  from: Date,
  upTo: Date,
  period: BillingPeriod,
  interval = 1,
  anchorDay?: number,
): Date[] {
  assertValidInterval(interval);
  const fromNorm = dateOnly(from);
  const upToNorm = dateOnly(upTo);
  const anchor = anchorDay ?? fromNorm.getUTCDate();

  const starts: Date[] = [];
  let current = fromNorm;
  while (current.getTime() <= upToNorm.getTime()) {
    starts.push(current);
    current = addPeriod(current, period, interval, anchor);
  }
  return starts;
}

/** Multiply a per-period amount by this to get a monthly amount (MRR). */
export function toMonthlyFactor(period: BillingPeriod, interval = 1): number {
  assertValidInterval(interval);
  const perPeriodMonths: Record<BillingPeriod, number> = {
    DAILY: 365 / 12,
    WEEKLY: 52 / 12,
    MONTHLY: 1,
    YEARLY: 1 / 12,
  };
  return perPeriodMonths[period] / interval;
}

const UNIT_LABEL: Record<BillingPeriod, string> = {
  DAILY: 'day',
  WEEKLY: 'week',
  MONTHLY: 'month',
  YEARLY: 'year',
};

export function formatPeriodLabel(period: BillingPeriod, interval = 1): string {
  assertValidInterval(interval);
  const unit = UNIT_LABEL[period];
  return interval === 1 ? unit : `${interval} ${unit}s`;
}
