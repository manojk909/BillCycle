import type { Prisma } from '@prisma/client';
import { prisma, type Tx } from '../../lib/prisma';
import { notFound, unprocessable } from '../../lib/http-error';
import { paginated, toPrismaArgs } from '../../lib/pagination';
import { D, toFixed2 } from '../../lib/money';
import { logActivity } from '../../lib/activity';
import { today } from '../../lib/dates';
import type { PaymentListQuery, RegisterPaymentInput } from './payments.schema';

const paymentSelect = {
  id: true,
  amount: true,
  date: true,
  note: true,
  createdAt: true,
  method: { select: { id: true, name: true } },
  recordedBy: { select: { id: true, name: true } },
  invoice: { select: { id: true, number: true, customer: { select: { id: true, name: true } } } },
} as const;

/** Recomputes paid/due from the payments table and moves the invoice between CONFIRMED and PAID. */
async function syncInvoiceBalance(tx: Tx, invoiceId: number) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const agg = await tx.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
  const paid = D(agg._sum.amount ?? 0);
  const due = D(invoice.amountTotal).minus(paid);
  return tx.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid: paid, amountDue: due, state: due.lte(0) ? 'PAID' : 'CONFIRMED' },
  });
}

export async function registerPayment(invoiceId: number, input: RegisterPaymentInput, userId: number) {
  if (input.date > today())
    throw unprocessable('Payment date cannot be in the future', { date: 'Cannot be in the future' });

  return prisma.$transaction(async (tx) => {
    // Row lock: two payments recorded at the same moment can't both see the old balance
    await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoiceId} FOR UPDATE`;
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw notFound('Invoice');
    if (invoice.state !== 'CONFIRMED') {
      const why = invoice.state === 'PAID' ? 'is already fully paid' : `is ${invoice.state.toLowerCase()}`;
      throw unprocessable(`Payments can only be recorded on confirmed invoices; this one ${why}`);
    }
    if (D(input.amount).gt(invoice.amountDue)) {
      throw unprocessable('Amount is more than what is due', {
        amount: `Maximum is ${toFixed2(invoice.amountDue)}`,
      });
    }
    const method = await tx.paymentMethod.findFirst({ where: { id: input.methodId, isActive: true } });
    if (!method)
      throw unprocessable('Choose a valid payment method', { methodId: 'Choose a payment method' });

    const payment = await tx.payment.create({
      data: {
        invoiceId,
        methodId: method.id,
        amount: input.amount,
        date: input.date,
        note: input.note,
        recordedById: userId,
      },
      select: paymentSelect,
    });
    const updated = await syncInvoiceBalance(tx, invoiceId);
    await logActivity(tx, {
      entityType: 'invoice',
      entityId: invoiceId,
      action: 'payment',
      message: `Payment of ${toFixed2(input.amount)} by ${method.name}${updated.state === 'PAID' ? '; invoice paid in full' : ''}`,
      userId,
    });
    return {
      payment,
      invoice: {
        id: updated.id,
        state: updated.state,
        amountPaid: updated.amountPaid,
        amountDue: updated.amountDue,
      },
    };
  });
}

export async function deletePayment(id: number, userId: number) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id }, include: { invoice: true } });
    if (!payment) throw notFound('Payment');
    if (payment.invoice.state === 'CANCELLED') throw unprocessable('The invoice is cancelled');
    await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${payment.invoiceId} FOR UPDATE`;
    await tx.payment.delete({ where: { id } });
    await syncInvoiceBalance(tx, payment.invoiceId);
    await logActivity(tx, {
      entityType: 'invoice',
      entityId: payment.invoiceId,
      action: 'payment_removed',
      message: `Payment of ${toFixed2(payment.amount)} removed`,
      userId,
    });
  });
}

export function invoicePayments(invoiceId: number) {
  return prisma.payment.findMany({ where: { invoiceId }, orderBy: { date: 'asc' }, select: paymentSelect });
}

export async function listPayments(p: PaymentListQuery) {
  const where: Prisma.PaymentWhereInput = {
    ...(p.from || p.to
      ? { date: { ...(p.from ? { gte: p.from } : {}), ...(p.to ? { lte: p.to } : {}) } }
      : {}),
    ...(p.methodId ? { methodId: p.methodId } : {}),
    ...(p.customerId ? { invoice: { customerId: p.customerId } } : {}),
    ...(p.q
      ? {
          OR: [
            { invoice: { number: { contains: p.q, mode: 'insensitive' } } },
            { invoice: { customer: { name: { contains: p.q, mode: 'insensitive' } } } },
            { note: { contains: p.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [rows, total, agg] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      select: paymentSelect,
      ...toPrismaArgs(p, ['date', 'amount', 'createdAt'], '-date'),
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
  ]);
  return { ...paginated(rows, total, p), summary: { totalAmount: toFixed2(agg._sum.amount ?? 0) } };
}

export function activePaymentMethods() {
  return prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}
