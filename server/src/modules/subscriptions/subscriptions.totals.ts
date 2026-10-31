import type { Prisma } from '@prisma/client';
import type { Tx } from '../../lib/prisma';
import { computeLine, sumTotals, type TaxInput } from '../../lib/tax';
import { notFound } from '../../lib/http-error';

/**
 * Recomputes every subscription line and the header totals from the stored
 * unit price, quantity and taxes, then persists them. Reused by SK1 (create/update),
 * SK4 (invoice generation reads the same line shape) and M13 (portal).
 *
 * Totals only include active lines (the plan line is always active); inactive
 * add-ons are stored with their own line totals but excluded from the header.
 */
export async function recomputeSubscription(tx: Tx, id: number) {
  const sub = await tx.subscription.findUnique({
    where: { id },
    include: { lines: { include: { taxes: true } } },
  });
  if (!sub) throw notFound('Subscription');

  const headerLineTotals: { untaxed: Prisma.Decimal; tax: Prisma.Decimal; total: Prisma.Decimal }[] = [];

  for (const line of sub.lines) {
    const taxes: TaxInput[] = line.taxes.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      rate: t.rate,
    }));
    const totals = computeLine({ quantity: line.quantity, unitPrice: line.unitPrice, taxes });
    await tx.subscriptionLine.update({
      where: { id: line.id },
      data: { amountUntaxed: totals.untaxed, amountTax: totals.tax, amountTotal: totals.total },
    });
    if (line.isActive) headerLineTotals.push(totals);
  }

  const header = sumTotals(headerLineTotals);
  return tx.subscription.update({
    where: { id },
    data: { amountUntaxed: header.untaxed, amountTax: header.tax, amountTotal: header.total },
  });
}
