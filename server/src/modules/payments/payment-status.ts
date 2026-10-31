import type { InvoiceState, Prisma } from '@prisma/client';
import { D, type DecimalLike } from '../../lib/money';

export type PaymentStatus = 'DRAFT' | 'CANCELLED' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'OUTSTANDING';

/** Display status of an invoice. Overdue and partial are derived, never stored (docs/04 §7). */
export function paymentStatus(
  inv: { state: InvoiceState; amountPaid: DecimalLike; amountDue: DecimalLike; dueDate: Date },
  today: Date,
): PaymentStatus {
  if (inv.state === 'DRAFT' || inv.state === 'CANCELLED' || inv.state === 'PAID') return inv.state;
  if (D(inv.amountDue).lte(0)) return 'PAID';
  if (inv.dueDate < today) return 'OVERDUE';
  if (D(inv.amountPaid).gt(0)) return 'PARTIAL';
  return 'OUTSTANDING';
}

/** Same rules as a Prisma `where`, for list filters and reports (SK6, M11). */
export function paymentStatusWhere(status: PaymentStatus, today: Date): Prisma.InvoiceWhereInput {
  const open = { state: 'CONFIRMED' as const, amountDue: { gt: 0 } };
  switch (status) {
    case 'DRAFT':
    case 'CANCELLED':
    case 'PAID':
      return { state: status };
    case 'OVERDUE':
      return { ...open, dueDate: { lt: today } };
    case 'PARTIAL':
      return { ...open, amountPaid: { gt: 0 }, dueDate: { gte: today } };
    case 'OUTSTANDING':
      return { ...open, amountPaid: 0, dueDate: { gte: today } };
  }
}
