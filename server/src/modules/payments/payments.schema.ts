import { z } from 'zod';
import { zDate, zId, zMoney } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';

export const invoiceParams = z.object({ invoiceId: zId });

export const registerPaymentSchema = z.object({
  methodId: z.coerce
    .number({ invalid_type_error: 'Choose a payment method' })
    .int()
    .positive('Choose a payment method'),
  amount: zMoney.refine((v) => Number(v) > 0, 'Amount must be greater than 0'),
  date: zDate,
  note: z
    .string()
    .trim()
    .max(500, 'Note is too long')
    .optional()
    .transform((v) => v || null),
});

export const paymentListQuery = paginationSchema.extend({
  from: zDate.optional(),
  to: zDate.optional(),
  methodId: zId.optional(),
  customerId: zId.optional(),
});

export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
export type PaymentListQuery = z.infer<typeof paymentListQuery>;
