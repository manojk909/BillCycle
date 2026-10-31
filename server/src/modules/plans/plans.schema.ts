import { z } from 'zod';
import { BillingPeriod } from '@prisma/client';
import { zDate, zId, zMoney, zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';
import { toDateOnly } from '../../lib/dates';
import { zActiveFilter } from '../taxes/taxes.schema';

/** '' or null clears the date; a missing key stays undefined so PATCH leaves it alone. */
// zDate coerces null to 1970-01-01, so the null/'' branches must be tried first.
const zOptionalDate = z
  .union([z.literal(''), z.null(), zDate])
  .optional()
  .transform((v) => (v === undefined ? undefined : v ? toDateOnly(v) : null));

const fields = {
  name: zName('Name'),
  price: zMoney,
  billingPeriod: z.nativeEnum(BillingPeriod, { errorMap: () => ({ message: 'Choose a billing period' }) }),
  billingInterval: z.coerce
    .number()
    .int('Use a whole number')
    .min(1, 'Bill every 1 to 12 periods')
    .max(12, 'Bill every 1 to 12 periods'),
  minQuantity: z.coerce.number().int('Use a whole number').min(1, 'Minimum quantity is at least 1'),
  startDate: zOptionalDate,
  endDate: zOptionalDate,
  autoClose: z.boolean(),
  closable: z.boolean(),
  pausable: z.boolean(),
  renewable: z.boolean(),
  isActive: z.boolean(),
  taxIds: z.array(zId).max(10, 'Too many taxes'),
};

const endAfterStart = (v: { startDate?: Date | null; endDate?: Date | null }) =>
  !v.startDate || !v.endDate || v.endDate >= v.startDate;
const endAfterStartMsg = { path: ['endDate'], message: 'End date must be on or after the start date' };

export const planBodySchema = z
  .object({
    ...fields,
    billingInterval: fields.billingInterval.default(1),
    minQuantity: fields.minQuantity.default(1),
    autoClose: fields.autoClose.default(false),
    closable: fields.closable.default(true),
    pausable: fields.pausable.default(false),
    renewable: fields.renewable.default(true),
    isActive: fields.isActive.default(true),
    taxIds: fields.taxIds.default([]),
  })
  .refine(endAfterStart, endAfterStartMsg);

// The date order is re-checked in the service against the stored value when only one bound is sent.
export const planUpdateSchema = z.object(fields).partial().refine(endAfterStart, endAfterStartMsg);

export const planListQuery = paginationSchema.extend({
  billingPeriod: z.nativeEnum(BillingPeriod).optional(),
  availableOn: zDate.optional(),
  active: zActiveFilter,
});

export const planOptionsQuery = z.object({ availableOn: zDate.optional(), q: z.string().trim().optional() });

export type PlanBody = z.infer<typeof planBodySchema>;
export type PlanUpdate = z.infer<typeof planUpdateSchema>;
export type PlanListQuery = z.infer<typeof planListQuery>;
export type PlanOptionsQuery = z.infer<typeof planOptionsQuery>;
