import { z } from 'zod';
import { SubscriptionState } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination';
import { zId, zDate, zMoney } from '../../middleware/validate';

export const listQuery = paginationSchema.extend({
  state: z.nativeEnum(SubscriptionState).optional(),
  planId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
});
export type ListQuery = z.infer<typeof listQuery>;

const lineInput = z.object({
  variantId: zId,
  quantity: z.coerce.number().int().positive().default(1),
  unitPrice: zMoney.optional(),
  taxIds: z.array(zId).optional(),
  description: z.string().trim().max(240).optional(),
});

export const createBody = z
  .object({
    customerId: zId,
    planId: zId,
    quantity: z.coerce.number().int().positive().default(1),
    startDate: zDate,
    expiryDate: zDate.optional(),
    paymentTermId: zId,
    lines: z.array(lineInput).default([]),
  })
  .refine((v) => !v.expiryDate || v.expiryDate > v.startDate, {
    message: 'Expiry date must be after the start date',
    path: ['expiryDate'],
  });
export type CreateBody = z.infer<typeof createBody>;

export const fromTemplateBody = z.object({
  templateId: zId,
  customerId: zId,
  startDate: zDate,
  paymentTermId: zId,
});
export type FromTemplateBody = z.infer<typeof fromTemplateBody>;

// Add-on lines on update: id present => existing line; absent => new add-on line.
const updateLine = z.object({
  id: zId.optional(),
  variantId: zId.optional(),
  quantity: z.coerce.number().int().positive().optional(),
  unitPrice: zMoney.optional(),
  taxIds: z.array(zId).optional(),
  description: z.string().trim().max(240).optional(),
  isActive: z.boolean().optional(),
});

export const updateBody = z.object({
  quantity: z.coerce.number().int().positive().optional(),
  startDate: zDate.optional(),
  expiryDate: zDate.nullable().optional(),
  paymentTermId: zId.optional(),
  lines: z.array(updateLine).optional(),
});
export type UpdateBody = z.infer<typeof updateBody>;

export const actionBody = z.object({ reason: z.string().trim().max(240).optional() });
