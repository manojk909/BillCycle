import { Prisma } from '@prisma/client';
import type { Tx } from '../../lib/prisma';
import { prisma } from '../../lib/prisma';
import { computeLine, sumTotals, type TaxInput } from '../../lib/tax';
import { D, sum } from '../../lib/money';
import { periodEnd, type BillingPeriod } from '../../lib/period';
import { toDateOnly, addDays } from '../../lib/dates';
import { logActivity } from '../../lib/activity';
import { conflict, notFound } from '../../lib/http-error';

export type GenerateResult = { status: 'created' | 'skipped'; invoiceId?: number };

// ---- Discount engine fallback until S8 is merged ----
// TODO(S8): replace with loadCandidateRules / applyDiscounts / consumeUsage.
type LineDiscount = { discountAmount: Prisma.Decimal };
async function applyDiscountsFallback(): Promise<Map<number, LineDiscount>> {
  return new Map(); // no discounts until S8 ships
}

/**
 * SK4: create one invoice for a subscription's billing period.
 * Runs inside the caller's transaction (SK5 billing run opens one tx per subscription).
 * Idempotent: the partial unique index (subscription_id, period_start) WHERE state<>'CANCELLED'
 * guarantees "never bill twice". A concurrent duplicate surfaces as P2002 and is reported as skipped.
 */
export async function generateInvoiceForPeriod(
  tx: Tx,
  subscriptionId: number,
  periodStart: Date,
): Promise<GenerateResult> {
  const start = toDateOnly(periodStart);

  // Lock the subscription row for the duration of the transaction.
  await tx.$queryRaw`SELECT id FROM subscriptions WHERE id = ${subscriptionId} FOR UPDATE`;

  const sub = await tx.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: true,
      paymentTerm: true,
      customer: true,
      lines: { include: { taxes: true } },
    },
  });
  if (!sub) throw notFound('Subscription');
  if (sub.state !== 'ACTIVE') return { status: 'skipped' };

  // Already billed for this period (non-cancelled)?
  const existing = await tx.invoice.findFirst({
    where: { subscriptionId, periodStart: start, state: { not: 'CANCELLED' } },
    select: { id: true },
  });
  if (existing) return { status: 'skipped' };

  const end = periodEnd(start, sub.plan.billingPeriod as BillingPeriod, sub.plan.billingInterval);

  // Plan line + active add-ons only.
  const billableLines = sub.lines.filter((l) => l.isPlanLine || l.isActive);
  const discounts = await applyDiscountsFallback();

  const computed = billableLines.map((line) => {
    const taxes: TaxInput[] = line.taxes.map((t) => ({ id: t.id, name: t.name, type: t.type, rate: t.rate }));
    const discountAmount = discounts.get(line.id)?.discountAmount ?? D(0);
    const totals = computeLine({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount,
      taxes,
    });
    return { line, discountAmount, totals, taxIds: line.taxes.map((t) => t.id) };
  });

  const header = sumTotals(computed.map((c) => c.totals));
  const amountDiscount = sum(computed.map((c) => c.discountAmount));

  const c = sub.customer;
  const billingAddress =
    [c.street, c.city, c.state, c.zip, c.country].filter(Boolean).join(', ') || null;
  const dueDate = addDays(start, sub.paymentTerm.dueDays);

  try {
    const invoice = await tx.invoice.create({
      data: {
        subscriptionId,
        customerId: c.id,
        state: 'DRAFT',
        periodStart: start,
        periodEnd: end,
        invoiceDate: start,
        dueDate,
        billingName: c.companyName ? `${c.companyName} (${c.name})` : c.name,
        billingEmail: c.email,
        billingAddress,
        amountUntaxed: header.untaxed,
        amountDiscount,
        amountTax: header.tax,
        amountTotal: header.total,
        amountPaid: 0,
        amountDue: header.total,
        lines: {
          create: computed.map((c) => ({
            variantId: c.line.variantId,
            isPlanLine: c.line.isPlanLine,
            description: c.line.description,
            quantity: c.line.quantity,
            unitPrice: c.line.unitPrice,
            discountAmount: c.discountAmount,
            amountUntaxed: c.totals.untaxed,
            amountTax: c.totals.tax,
            amountTotal: c.totals.total,
            taxes: { connect: c.taxIds.map((id) => ({ id })) },
          })),
        },
      },
    });

    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { nextInvoiceDate: addDays(end, 1) },
    });

    await logActivity(tx, {
      entityType: 'subscription',
      entityId: subscriptionId,
      action: 'invoice',
      message: `Draft invoice created for ${start.toISOString().slice(0, 10)} – ${end
        .toISOString()
        .slice(0, 10)}`,
      userId: null,
    });

    return { status: 'created', invoiceId: invoice.id };
  } catch (err) {
    // Race: another worker created the same (subscription, period) first.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { status: 'skipped' };
    }
    throw err;
  }
}

/**
 * Manual "Create invoice" for a subscription's current nextInvoiceDate.
 * Opens its own transaction; used by POST /api/subscriptions/:id/invoices.
 */
export async function generateCurrentInvoice(subscriptionId: number): Promise<GenerateResult> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: { state: true, nextInvoiceDate: true },
  });
  if (!sub) throw notFound('Subscription');
  if (sub.state !== 'ACTIVE') {
    throw conflict('Only active subscriptions can be invoiced', 'INVALID_STATE');
  }
  if (!sub.nextInvoiceDate) {
    throw conflict('This subscription has no upcoming billing date', 'NO_NEXT_INVOICE');
  }
  return prisma.$transaction((tx) => generateInvoiceForPeriod(tx, subscriptionId, sub.nextInvoiceDate!));
}
