import type { Prisma } from '@prisma/client';
import { D, round2, sum, max, type DecimalLike } from './money';

export type TaxInput = { id: number; name: string; type: 'PERCENT' | 'FIXED'; rate: DecimalLike };

export type LineInput = {
  quantity: number;
  unitPrice: DecimalLike;
  discountAmount?: DecimalLike;
  taxes?: TaxInput[];
};

export type LineTotals = {
  untaxed: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
  breakdown: { taxId: number; name: string; amount: Prisma.Decimal }[];
};

/** Tax is computed on the line amount after discount; each tax uses the same base (no tax-on-tax). */
export function computeLine({ quantity, unitPrice, discountAmount = 0, taxes = [] }: LineInput): LineTotals {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantity must be a positive integer');
  const untaxed = round2(max(D(unitPrice).times(quantity).minus(D(discountAmount)), 0));
  const breakdown = taxes.map((t) => ({
    taxId: t.id,
    name: t.name,
    amount:
      t.type === 'PERCENT' ? round2(untaxed.times(D(t.rate)).div(100)) : round2(D(t.rate).times(quantity)),
  }));
  const tax = sum(breakdown.map((b) => b.amount));
  return { untaxed, tax, total: untaxed.plus(tax), breakdown };
}

export function sumTotals(lines: Pick<LineTotals, 'untaxed' | 'tax' | 'total'>[]) {
  return {
    untaxed: sum(lines.map((l) => l.untaxed)),
    tax: sum(lines.map((l) => l.tax)),
    total: sum(lines.map((l) => l.total)),
  };
}
