import { z } from 'zod';
import { TaxType } from '@prisma/client';
import { zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';

// Column is Decimal(7,4): allow up to 4 decimals. The PERCENT <= 100 rule needs the type too, so it lives in the service.
const zRate = z
  .union([z.number(), z.string().trim().min(1, 'Rate is required')])
  .transform((v) => String(v))
  .refine((v) => /^\d+(\.\d{1,4})?$/.test(v), 'Enter a valid rate of 0 or more (up to 4 decimals)');

export const zActiveFilter = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

export const taxBodySchema = z.object({
  name: zName('Name', 60),
  type: z.nativeEnum(TaxType, { errorMap: () => ({ message: 'Choose Percent or Fixed' }) }),
  rate: zRate,
  isActive: z.boolean().optional(),
});

export const taxUpdateSchema = taxBodySchema.partial();

export const taxListQuery = paginationSchema.extend({ active: zActiveFilter });

export type TaxBody = z.infer<typeof taxBodySchema>;
export type TaxUpdate = z.infer<typeof taxUpdateSchema>;
export type TaxListQuery = z.infer<typeof taxListQuery>;
