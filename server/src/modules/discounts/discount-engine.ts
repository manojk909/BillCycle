import { Prisma, type DiscountScope, type DiscountType } from '@prisma/client';
import type { Tx } from '../../lib/prisma';
import { D, round2, sum, type DecimalLike } from '../../lib/money';
import { toDateOnly } from '../../lib/dates';

// Discount engine (docs/04-business-rules.md §5). SK4 invoice generation calls it:
//   const rules = await loadCandidateRules(tx, ctx);
//   const { lineDiscounts, applied } = applyDiscounts(lines, rules, ctx);
//   ...create the invoice with lineDiscounts..., then consumeUsage(tx, rule.ruleId, ...) for each applied rule.
// Cancelling an invoice calls releaseUsage(tx, invoiceId).

export type EngineLine = {
  key: string; // stable id for the line (e.g. subscriptionLine id or "plan")
  productId: number | null; // null for the plan line
  quantity: Prisma.Decimal;
  untaxed: Prisma.Decimal; // qty × unitPrice, before discount
};

export type DiscountContext = { invoiceDate: Date; customerId: number; subscriptionId: number };

export type DiscountRuleWithRelations = {
  id: number;
  name: string;
  type: DiscountType;
  value: DecimalLike;
  scope: DiscountScope;
  minPurchaseAmount: DecimalLike | null;
  minQuantity: number | null;
  startDate: Date;
  endDate: Date;
  usageLimit: number | null;
  timesUsed: number;
  isActive: boolean;
  productIds: number[];
  customerIds: number[]; // empty = every customer
};

export type DiscountResult = {
  lineDiscounts: Record<string, Prisma.Decimal>; // key → discount amount (rounded, ≤ line untaxed)
  applied: { ruleId: number; name: string; amount: Prisma.Decimal }[];
};

const ZERO = D(0);

/** Rule-level checks that don't depend on the lines: active, in date range, uses left, customer match. */
export function isRuleEligible(rule: DiscountRuleWithRelations, ctx: DiscountContext): boolean {
  const day = toDateOnly(ctx.invoiceDate).getTime();
  if (!rule.isActive) return false;
  if (day < toDateOnly(rule.startDate).getTime() || day > toDateOnly(rule.endDate).getTime()) return false;
  if (rule.usageLimit !== null && rule.timesUsed >= rule.usageLimit) return false;
  if (rule.customerIds.length > 0 && !rule.customerIds.includes(ctx.customerId)) return false;
  return true;
}

function meetsThresholds(rule: DiscountRuleWithRelations, matching: EngineLine[]): boolean {
  if (rule.minQuantity !== null && sum(matching.map((l) => l.quantity)).lessThan(rule.minQuantity)) return false;
  if (rule.minPurchaseAmount !== null && sum(matching.map((l) => l.untaxed)).lessThan(D(rule.minPurchaseAmount))) {
    return false;
  }
  return true;
}

/**
 * Splits `total` across `weights` in proportion, in whole paise, so the parts sum exactly to `total`
 * and no part exceeds its weight (largest-remainder method; requires total ≤ Σ weights).
 */
export function splitProportionally(total: DecimalLike, weights: Prisma.Decimal[]): Prisma.Decimal[] {
  const totalPaise = round2(total).times(100);
  const weightPaise = weights.map((w) => round2(w).times(100));
  const weightSum = sum(weightPaise);
  if (weightSum.isZero() || totalPaise.isZero()) return weights.map(() => ZERO);
  const raw = weightPaise.map((w) => totalPaise.times(w).div(weightSum));
  const parts = raw.map((r) => r.floor());
  let left = totalPaise.minus(sum(parts)).toNumber();
  // Hand the leftover paise to the largest fractional parts; ties go to the later line.
  const order = raw
    .map((r, i) => ({ i, frac: r.minus(r.floor()) }))
    .sort((a, b) => b.frac.comparedTo(a.frac) || b.i - a.i);
  for (const { i } of order) {
    if (left <= 0) break;
    parts[i] = parts[i].plus(1);
    left -= 1;
  }
  return parts.map((p) => p.div(100));
}

/** Discount a rule gives each of `lines` (all of them matching), with `bases` as the amount it may discount. */
function allocate(rule: DiscountRuleWithRelations, bases: Prisma.Decimal[]): Prisma.Decimal[] {
  if (rule.type === 'PERCENT') return bases.map((b) => round2(b.times(D(rule.value)).div(100)));
  // FIXED: clamp to the base so the total never goes negative, then split by line amount.
  const capped = Prisma.Decimal.min(round2(rule.value), sum(bases));
  return splitProportionally(capped, bases);
}

/** Best rule wins; ties go to the lower rule id so results are repeatable. */
const better = (a: { amount: Prisma.Decimal; ruleId: number }, b: { amount: Prisma.Decimal; ruleId: number }) =>
  a.amount.greaterThan(b.amount) || (a.amount.equals(b.amount) && a.ruleId < b.ruleId);

/** PURE. Product-level rules first (best single rule per line), then at most one subscription-level rule on what's left. */
export function applyDiscounts(
  lines: EngineLine[],
  rules: DiscountRuleWithRelations[],
  ctx: DiscountContext,
): DiscountResult {
  const eligible = rules.filter((r) => isRuleEligible(r, ctx));
  const productDiscount = new Map<string, { amount: Prisma.Decimal; ruleId: number }>();

  // 1. Product scope: each rule only sees lines whose product it targets; the plan line (productId null) never matches.
  for (const rule of eligible.filter((r) => r.scope === 'PRODUCTS')) {
    const matching = lines.filter((l) => l.productId !== null && rule.productIds.includes(l.productId));
    if (!matching.length || !meetsThresholds(rule, matching)) continue;
    const amounts = allocate(
      rule,
      matching.map((l) => l.untaxed),
    );
    matching.forEach((line, i) => {
      const candidate = { amount: amounts[i], ruleId: rule.id };
      const current = productDiscount.get(line.key);
      if (candidate.amount.greaterThan(0) && (!current || better(candidate, current))) {
        productDiscount.set(line.key, candidate);
      }
    });
  }

  // 2. Subscription scope: thresholds over all lines, discount on the amount left after product discounts.
  const remaining = lines.map((l) => l.untaxed.minus(productDiscount.get(l.key)?.amount ?? ZERO));
  let subscriptionPick: { ruleId: number; amounts: Prisma.Decimal[]; amount: Prisma.Decimal } | null = null;
  for (const rule of eligible.filter((r) => r.scope === 'SUBSCRIPTION')) {
    if (!lines.length || !meetsThresholds(rule, lines)) continue;
    const amounts = allocate(rule, remaining);
    const candidate = { ruleId: rule.id, amounts, amount: sum(amounts) };
    if (candidate.amount.greaterThan(0) && (!subscriptionPick || better(candidate, subscriptionPick))) {
      subscriptionPick = candidate;
    }
  }

  const lineDiscounts: Record<string, Prisma.Decimal> = {};
  const appliedTotals = new Map<number, Prisma.Decimal>();
  lines.forEach((line, i) => {
    const product = productDiscount.get(line.key);
    const subscription = subscriptionPick?.amounts[i] ?? ZERO;
    lineDiscounts[line.key] = (product?.amount ?? ZERO).plus(subscription);
    if (product) appliedTotals.set(product.ruleId, (appliedTotals.get(product.ruleId) ?? ZERO).plus(product.amount));
  });
  if (subscriptionPick) appliedTotals.set(subscriptionPick.ruleId, subscriptionPick.amount);

  const byId = new Map(eligible.map((r) => [r.id, r]));
  const applied = [...appliedTotals].map(([ruleId, amount]) => ({ ruleId, name: byId.get(ruleId)!.name, amount }));
  return { lineDiscounts, applied };
}

/** Rules that could apply on ctx.invoiceDate: active, in date range, uses left, open to this customer. */
export async function loadCandidateRules(tx: Tx, ctx: DiscountContext): Promise<DiscountRuleWithRelations[]> {
  const day = toDateOnly(ctx.invoiceDate);
  const rows = await tx.discountRule.findMany({
    where: {
      isActive: true,
      startDate: { lte: day },
      endDate: { gte: day },
      OR: [{ customers: { none: {} } }, { customers: { some: { id: ctx.customerId } } }],
    },
    include: { products: { select: { id: true } }, customers: { select: { id: true } } },
  });
  return rows
    .filter((r) => r.usageLimit === null || r.timesUsed < r.usageLimit)
    .map(({ products, customers, ...r }) => ({
      ...r,
      productIds: products.map((p) => p.id),
      customerIds: customers.map((c) => c.id),
    }));
}

/**
 * Records one use of a rule for an invoice. The conditional UPDATE is atomic, so concurrent billing runs can't
 * exceed the limit: returns false (and records nothing) when the rule ran out in the meantime.
 */
export async function consumeUsage(
  tx: Tx,
  ruleId: number,
  usage: { invoiceId: number; subscriptionId: number; amount: Prisma.Decimal },
): Promise<boolean> {
  const updated = await tx.$executeRaw`
    UPDATE discount_rules SET times_used = times_used + 1
    WHERE id = ${ruleId} AND is_active AND (usage_limit IS NULL OR times_used < usage_limit)`;
  if (updated === 0) return false;
  await tx.discountUsage.create({
    data: { discountId: ruleId, invoiceId: usage.invoiceId, subscriptionId: usage.subscriptionId, amount: usage.amount },
  });
  return true;
}

/** Gives back every use an invoice consumed (called when the invoice is cancelled). */
export async function releaseUsage(tx: Tx, invoiceId: number): Promise<void> {
  const usages = await tx.discountUsage.findMany({ where: { invoiceId }, select: { id: true, discountId: true } });
  for (const u of usages) {
    await tx.$executeRaw`UPDATE discount_rules SET times_used = GREATEST(times_used - 1, 0) WHERE id = ${u.discountId}`;
  }
  await tx.discountUsage.deleteMany({ where: { invoiceId } });
}
