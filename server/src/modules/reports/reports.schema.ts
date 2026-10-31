import { z } from 'zod';
import { zDate, zId } from '../../middleware/validate';

export const reportFilters = z
  .object({
    from: zDate.optional(),
    to: zDate.optional(),
    planId: zId.optional(),
    customerId: zId.optional(),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, {
    path: ['to'],
    message: 'End date must be after start date',
  });

export const trendQuery = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
  planId: zId.optional(),
  customerId: zId.optional(),
});

export const overdueQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  planId: zId.optional(),
  customerId: zId.optional(),
});

export type ReportFilters = z.infer<typeof reportFilters>;
export type TrendQuery = z.infer<typeof trendQuery>;
export type OverdueQuery = z.infer<typeof overdueQuery>;
