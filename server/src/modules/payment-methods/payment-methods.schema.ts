import { z } from 'zod';
import { zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';
import { zActiveFilter } from '../taxes/taxes.schema';

export const paymentMethodBodySchema = z.object({
  name: zName('Name', 60),
  isActive: z.boolean().optional(),
});

export const paymentMethodUpdateSchema = paymentMethodBodySchema.partial();

export const paymentMethodListQuery = paginationSchema.extend({ active: zActiveFilter });

export type PaymentMethodBody = z.infer<typeof paymentMethodBodySchema>;
export type PaymentMethodUpdate = z.infer<typeof paymentMethodUpdateSchema>;
export type PaymentMethodListQuery = z.infer<typeof paymentMethodListQuery>;
