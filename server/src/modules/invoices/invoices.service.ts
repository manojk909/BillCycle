import type { InvoiceState, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { Tx } from '../../lib/prisma';
import { conflict, notFound, unprocessable } from '../../lib/http-error';
import { paginated, toPrismaArgs } from '../../lib/pagination';
import { computeLine, sumTotals, type TaxInput } from '../../lib/tax';
import { D } from '../../lib/money';
import { nextNumber } from '../../lib/sequence';
import { logActivity } from '../../lib/activity';
import { today, toDateOnly } from '../../lib/dates';
import { sendMail } from '../../lib/mailer';
import { paymentStatus, paymentStatusWhere, type PaymentStatus } from '../payments/payment-status';
import { buildInvoicePrintData } from './invoice-print-data';
import type { BulkConfirmBody, ListQuery, PatchBody } from './invoices.schema';

export type Actor = number | 'system';
const userId = (a: Actor): number | null => (a === 'system' ? null : a);

const STATUS_MAP: Record<string, PaymentStatus> = {
  draft: 'DRAFT',
  outstanding: 'OUTSTANDING',
  overdue: 'OVERDUE',
  paid: 'PAID',
  partial: 'PARTIAL',
  cancelled: 'CANCELLED',
};

// Invoice actions available per state (cancel on CONFIRMED only if nothing paid).
function allowedInvoiceActions(inv: { state: InvoiceState; amountPaid: Prisma.Decimal }): string[] {
  switch (inv.state) {
    case 'DRAFT':
      return ['confirm', 'edit', 'cancel'];
    case 'CONFIRMED':
      return D(inv.amountPaid).gt(0) ? ['send'] : ['send', 'cancel'];
    case 'PAID':
      return ['send'];
    default:
      return [];
  }
}

// ---- Queries ----

function listWhere(p: ListQuery): Prisma.InvoiceWhereInput {
  const now = today();
  const where: Prisma.InvoiceWhereInput = {
    ...(p.state ? { state: p.state } : {}),
    ...(p.customerId ? { customerId: p.customerId } : {}),
    ...(p.subscriptionId ? { subscriptionId: p.subscriptionId } : {}),
    ...(p.from || p.to
      ? {
          invoiceDate: {
            ...(p.from ? { gte: toDateOnly(p.from) } : {}),
            ...(p.to ? { lte: toDateOnly(p.to) } : {}),
          },
        }
      : {}),
    ...(p.q
      ? {
          OR: [
            { number: { contains: p.q, mode: 'insensitive' } },
            { billingName: { contains: p.q, mode: 'insensitive' } },
            { customer: { name: { contains: p.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  if (p.status) Object.assign(where, paymentStatusWhere(STATUS_MAP[p.status], now));
  return where;
}

export async function listInvoices(p: ListQuery) {
  const where = listWhere(p);
  const now = today();
  const [rows, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      ...toPrismaArgs(p, ['number', 'invoiceDate', 'dueDate', 'amountTotal', 'amountDue', 'createdAt'], '-invoiceDate'),
      select: {
        id: true,
        number: true,
        state: true,
        invoiceDate: true,
        dueDate: true,
        amountTotal: true,
        amountPaid: true,
        amountDue: true,
        customer: { select: { id: true, name: true } },
        subscription: { select: { id: true, number: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);
  const data = rows.map((r) => ({ ...r, status: paymentStatus(r, now) }));
  return paginated(data, total, p);
}

export async function getInvoice(id: number) {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      lines: { include: { taxes: true }, orderBy: { id: 'asc' } },
      payments: { include: { method: { select: { name: true } } }, orderBy: { date: 'desc' } },
      customer: { select: { id: true, name: true, email: true } },
      subscription: { select: { id: true, number: true } },
    },
  });
  if (!inv) throw notFound('Invoice');
  return {
    ...inv,
    status: paymentStatus(inv, today()),
    allowedActions: allowedInvoiceActions(inv),
  };
}

export { buildInvoicePrintData };

// ---- Totals recompute (DRAFT edits) ----

async function recomputeInvoice(tx: Tx, id: number) {
  const inv = await tx.invoice.findUniqueOrThrow({
    where: { id },
    include: { lines: { include: { taxes: true } } },
  });
  const computed = inv.lines.map((line) => {
    const taxes: TaxInput[] = line.taxes.map((t) => ({ id: t.id, name: t.name, type: t.type, rate: t.rate }));
    const totals = computeLine({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount,
      taxes,
    });
    return { id: line.id, totals };
  });
  for (const c of computed) {
    await tx.invoiceLine.update({
      where: { id: c.id },
      data: { amountUntaxed: c.totals.untaxed, amountTax: c.totals.tax, amountTotal: c.totals.total },
    });
  }
  const header = sumTotals(computed.map((c) => c.totals));
  return tx.invoice.update({
    where: { id },
    data: {
      amountUntaxed: header.untaxed,
      amountTax: header.tax,
      amountTotal: header.total,
      amountDue: header.total.minus(inv.amountPaid),
    },
  });
}

export async function updateInvoice(id: number, body: PatchBody) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({ where: { id }, include: { lines: true } });
    if (!inv) throw notFound('Invoice');
    if (inv.state !== 'DRAFT') {
      throw conflict('Only draft invoices can be edited', 'INVALID_STATE');
    }
    if (body.invoiceDate || body.dueDate) {
      await tx.invoice.update({
        where: { id },
        data: {
          ...(body.invoiceDate ? { invoiceDate: toDateOnly(body.invoiceDate) } : {}),
          ...(body.dueDate ? { dueDate: toDateOnly(body.dueDate) } : {}),
        },
      });
    }
    for (const line of body.lines ?? []) {
      const current = inv.lines.find((l) => l.id === line.id);
      if (!current) continue;
      await tx.invoiceLine.update({
        where: { id: line.id },
        data: {
          ...(line.quantity !== undefined ? { quantity: line.quantity } : {}),
          ...(line.unitPrice !== undefined ? { unitPrice: line.unitPrice } : {}),
          ...(line.description !== undefined ? { description: line.description } : {}),
        },
      });
    }
    await recomputeInvoice(tx, id);
    return getInvoiceInTx(tx, id);
  });
}

// ---- Actions ----

/** DRAFT → CONFIRMED. Assigns the INV number. Exported so SK5 auto-confirm can reuse it. */
export async function confirmInvoice(tx: Tx, id: number, actor: Actor) {
  const inv = await tx.invoice.findUnique({ where: { id }, select: { state: true, invoiceDate: true, number: true } });
  if (!inv) throw notFound('Invoice');
  if (inv.state !== 'DRAFT') {
    throw conflict('Only draft invoices can be confirmed', 'INVALID_STATE');
  }
  const number = inv.number ?? (await nextNumber(tx, 'INV', inv.invoiceDate));
  const updated = await tx.invoice.update({
    where: { id },
    data: { state: 'CONFIRMED', number, confirmedAt: new Date() },
  });
  await logActivity(tx, {
    entityType: 'invoice',
    entityId: id,
    action: 'confirm',
    message: `Invoice ${number} confirmed`,
    userId: userId(actor),
  });
  return updated;
}

/** DRAFT or CONFIRMED (only if nothing paid) → CANCELLED. Exported for reuse. */
export async function cancelInvoice(tx: Tx, id: number, actor: Actor) {
  const inv = await tx.invoice.findUnique({ where: { id } });
  if (!inv) throw notFound('Invoice');
  if (inv.state !== 'DRAFT' && inv.state !== 'CONFIRMED') {
    throw conflict('Only draft or confirmed invoices can be cancelled', 'INVALID_STATE');
  }
  if (D(inv.amountPaid).gt(0)) {
    throw conflict('This invoice has payments and cannot be cancelled', 'HAS_PAYMENTS');
  }
  // TODO(S8): releaseUsage(tx, id) to return discount usage to the pool.
  const updated = await tx.invoice.update({
    where: { id },
    data: { state: 'CANCELLED', cancelledAt: new Date() },
  });
  await logActivity(tx, {
    entityType: 'invoice',
    entityId: id,
    action: 'cancel',
    message: `Invoice ${inv.number ?? id} cancelled`,
    userId: userId(actor),
  });
  return updated;
}

export function confirmInvoiceById(id: number, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    await confirmInvoice(tx, id, actor);
    return getInvoiceInTx(tx, id);
  });
}

export function cancelInvoiceById(id: number, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    await cancelInvoice(tx, id, actor);
    return getInvoiceInTx(tx, id);
  });
}

export async function bulkConfirm(body: BulkConfirmBody, actor: Actor) {
  const results: { id: number; status: 'confirmed' | 'error'; message?: string }[] = [];
  for (const id of body.ids) {
    try {
      await prisma.$transaction((tx) => confirmInvoice(tx, id, actor));
      results.push({ id, status: 'confirmed' });
    } catch (err) {
      results.push({ id, status: 'error', message: (err as Error).message });
    }
  }
  return { results, confirmed: results.filter((r) => r.status === 'confirmed').length };
}

export async function sendInvoice(id: number, actor: Actor, portalBaseUrl: string) {
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) throw notFound('Invoice');
  if (inv.state !== 'CONFIRMED' && inv.state !== 'PAID') {
    throw unprocessable('Only confirmed or paid invoices can be sent');
  }
  // TODO(T3): swap this inline template for `invoiceSentEmail`.
  const link = `${portalBaseUrl}/portal/invoices/${inv.id}`;
  const subject = `Invoice ${inv.number ?? ''} from Brightloop Software`.trim();
  const html = `<p>Dear ${inv.billingName},</p>
<p>Your invoice <strong>${inv.number ?? ''}</strong> for the period
${inv.periodStart.toISOString().slice(0, 10)} to ${inv.periodEnd.toISOString().slice(0, 10)}
is ready. Amount due: <strong>₹${inv.amountDue.toString()}</strong> by ${inv.dueDate
    .toISOString()
    .slice(0, 10)}.</p>
<p><a href="${link}">View your invoice</a></p>
<p>Thank you,<br/>Brightloop Software</p>`;
  const text = `Invoice ${inv.number ?? ''} — amount due ₹${inv.amountDue.toString()} by ${inv.dueDate
    .toISOString()
    .slice(0, 10)}. View it at ${link}`;

  await sendMail({ to: inv.billingEmail, subject, html, text });
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.invoice.update({ where: { id }, data: { sentAt: new Date() } });
    await logActivity(tx, {
      entityType: 'invoice',
      entityId: id,
      action: 'send',
      message: `Invoice ${inv.number ?? id} emailed to ${inv.billingEmail}`,
      userId: userId(actor),
    });
    return u;
  });
  return updated;
}

// Detail read inside a transaction after a mutation.
async function getInvoiceInTx(tx: Tx, id: number) {
  const inv = await tx.invoice.findUnique({
    where: { id },
    include: {
      lines: { include: { taxes: true }, orderBy: { id: 'asc' } },
      payments: { include: { method: { select: { name: true } } }, orderBy: { date: 'desc' } },
      customer: { select: { id: true, name: true, email: true } },
      subscription: { select: { id: true, number: true } },
    },
  });
  if (!inv) throw notFound('Invoice');
  return { ...inv, status: paymentStatus(inv, today()), allowedActions: allowedInvoiceActions(inv) };
}
