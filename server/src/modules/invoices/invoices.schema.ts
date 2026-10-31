import { z } from 'zod';
import { InvoiceState } from '@prisma/client';
import { paginationSchema } from '../../lib/pagination';
import { zId, zDate, zMoney } from '../../middleware/validate';

export const statusFilter = z.enum(['draft', 'outstanding', 'overdue', 'paid', 'partial', 'cancelled']);

export const listQuery = paginationSchema.extend({
  state: z.nativeEnum(InvoiceState).optional(),
  status: statusFilter.optional(),
  customerId: z.coerce.number().int().positive().optional(),
  subscriptionId: z.coerce.number().int().positive().optional(),
  from: zDate.optional(),
  to: zDate.optional(),
});
export type ListQuery = z.infer<typeof listQuery>;

// DRAFT-only edits: line qty/price/description and the dates.
const patchLine = z.object({
  id: zId,
  quantity: z.coerce.number().int().positive().optional(),
  unitPrice: zMoney.optional(),
  description: z.string().trim().max(240).optional(),
});

export const patchBody = z.object({
  invoiceDate: zDate.optional(),
  dueDate: zDate.optional(),
  lines: z.array(patchLine).optional(),
});
export type PatchBody = z.infer<typeof patchBody>;

export const bulkConfirmBody = z.object({
  ids: z.array(zId).min(1, 'Select at least one invoice'),
});
export type BulkConfirmBody = z.infer<typeof bulkConfirmBody>;
