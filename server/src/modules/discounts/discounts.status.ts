import { toDateOnly } from '../../lib/dates';

// Pure status rule, free of Prisma so it is cheap to unit test. listDiscounts mirrors it in SQL for ?status=.

export const DISCOUNT_STATUSES = ['active', 'scheduled', 'expired', 'exhausted', 'inactive'] as const;
export type DiscountStatus = (typeof DISCOUNT_STATUSES)[number];

export type StatusInput = {
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  usageLimit: number | null;
  timesUsed: number;
};

/** First match wins: inactive (switched off) > exhausted > expired > scheduled > active. */
export function discountStatus(rule: StatusInput, today: Date): DiscountStatus {
  const day = toDateOnly(today).getTime();
  if (!rule.isActive) return 'inactive';
  if (rule.usageLimit !== null && rule.timesUsed >= rule.usageLimit) return 'exhausted';
  if (toDateOnly(rule.endDate).getTime() < day) return 'expired';
  if (toDateOnly(rule.startDate).getTime() > day) return 'scheduled';
  return 'active';
}
