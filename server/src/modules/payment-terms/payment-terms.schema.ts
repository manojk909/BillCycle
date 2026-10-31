import { z } from 'zod';
import { zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';

export const paymentTermBodySchema = z.object({
  name: zName('Name', 60),
  dueDays: z.coerce
    .number({ invalid_type_error: 'Enter the number of days' })
    .int('Use whole days')
    .min(0, 'Due days must be between 0 and 365')
    .max(365, 'Due days must be between 0 and 365'),
});

export const paymentTermUpdateSchema = paymentTermBodySchema.partial();

export const paymentTermListQuery = paginationSchema;

export type PaymentTermBody = z.infer<typeof paymentTermBodySchema>;
export type PaymentTermUpdate = z.infer<typeof paymentTermUpdateSchema>;
