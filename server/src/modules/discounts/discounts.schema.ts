import { z } from 'zod';
import { DiscountScope, DiscountType } from '@prisma/client';
import { zDate, zId, zMoney, zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';
import { toDateOnly } from '../../lib/dates';
import { DISCOUNT_STATUSES } from './discounts.status';

// '' / null clear optional values; the literal branches go first because coercion turns null into 0 / 1970.
const optionalMoney = z
  .union([z.literal(''), z.null(), zMoney])
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

const optionalCount = (label: string) =>
  z
    .union([z.literal(''), z.null(), z.coerce.number().int('Use a whole number').min(1, `${label} must be at least 1`)])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === '' || v === null ? null : v));

const optionalCode = z
  .union([
    z.literal(''),
    z.null(),
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, 'Use 3–30 letters, digits, - or _'),
  ])
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

const fields = {
  name: zName('Name'),
  code: optionalCode,
  type: z.nativeEnum(DiscountType, { errorMap: () => ({ message: 'Choose percentage or fixed amount' }) }),
  value: zMoney,
  scope: z.nativeEnum(DiscountScope, { errorMap: () => ({ message: 'Choose what the discount applies to' }) }),
  productIds: z.array(zId).max(100, 'Too many products'),
  customerIds: z.array(zId).max(100, 'Too many customers'),
  minPurchaseAmount: optionalMoney,
  minQuantity: optionalCount('Minimum quantity'),
  startDate: zDate.transform(toDateOnly),
  endDate: zDate.transform(toDateOnly),
  usageLimit: optionalCount('Usage limit'),
  isActive: z.boolean(),
};

// Rules that combine several fields (value range, dates, products, usage) live in the service, so
// create and PATCH (merged with the stored rule) are checked the same way.
export const discountBodySchema = z.object({
  ...fields,
  productIds: fields.productIds.default([]),
  customerIds: fields.customerIds.default([]),
  isActive: fields.isActive.default(true),
});

export const discountUpdateSchema = z.object(fields).partial();

export const discountListQuery = paginationSchema.extend({
  status: z.enum(DISCOUNT_STATUSES).optional(),
  scope: z.nativeEnum(DiscountScope).optional(),
});

export type DiscountBody = z.infer<typeof discountBodySchema>;
export type DiscountUpdate = z.infer<typeof discountUpdateSchema>;
export type DiscountListQuery = z.infer<typeof discountListQuery>;
