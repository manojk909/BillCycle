import { describe, expect, it } from 'vitest';
import { D, sum } from '../../lib/money';
import {
  applyDiscounts,
  splitProportionally,
  type DiscountRuleWithRelations,
  type EngineLine,
} from './discount-engine';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const ctx = { invoiceDate: d('2026-11-15'), customerId: 1, subscriptionId: 10 };

let nextId = 1;
const rule = (over: Partial<DiscountRuleWithRelations> = {}): DiscountRuleWithRelations => ({
  id: nextId++,
  name: 'Rule',
  type: 'PERCENT',
  value: 10,
  scope: 'SUBSCRIPTION',
  minPurchaseAmount: null,
  minQuantity: null,
  startDate: d('2026-11-01'),
  endDate: d('2026-11-30'),
  usageLimit: null,
  timesUsed: 0,
  isActive: true,
  productIds: [],
  customerIds: [],
  ...over,
});

const line = (key: string, productId: number | null, untaxed: number | string, quantity = 1): EngineLine => ({
  key,
  productId,
  quantity: D(quantity),
  untaxed: D(untaxed),
});

// Plan line (no product) + two add-ons: CRM (product 1) and Storage (product 2).
const lines = [line('plan', null, 1000, 5), line('crm', 1, 1760), line('storage', 2, 199, 2)];

const amounts = (r: ReturnType<typeof applyDiscounts>) =>
  Object.fromEntries(Object.entries(r.lineDiscounts).map(([k, v]) => [k, v.toFixed(2)]));

describe('applyDiscounts: subscription scope', () => {
  it('percent discount applies to every line, plan line included', () => {
    const r = applyDiscounts(lines, [rule({ value: 10 })], ctx);
    expect(amounts(r)).toEqual({ plan: '100.00', crm: '176.00', storage: '19.90' });
    expect(r.applied[0].amount.toFixed(2)).toBe('295.90');
  });

  it('fixed discount is split across lines in proportion to their amount', () => {
    const r = applyDiscounts(lines, [rule({ type: 'FIXED', value: 295.9 })], ctx);
    expect(sum(Object.values(r.lineDiscounts)).toFixed(2)).toBe('295.90');
    expect(r.lineDiscounts.crm.greaterThan(r.lineDiscounts.plan)).toBe(true);
  });

  it('fixed discount bigger than the total is clamped to the total (never negative)', () => {
    const r = applyDiscounts(lines, [rule({ type: 'FIXED', value: 99999 })], ctx);
    expect(amounts(r)).toEqual({ plan: '1000.00', crm: '1760.00', storage: '199.00' });
    expect(r.applied[0].amount.toFixed(2)).toBe('2959.00');
  });

  it('100% discount zeroes every line exactly', () => {
    const r = applyDiscounts(lines, [rule({ value: 100 })], ctx);
    expect(sum(Object.values(r.lineDiscounts)).toFixed(2)).toBe('2959.00');
  });
});

describe('applyDiscounts: product scope', () => {
  it('only hits lines of the targeted products', () => {
    const r = applyDiscounts(lines, [rule({ scope: 'PRODUCTS', productIds: [1], value: 50 })], ctx);
    expect(amounts(r)).toEqual({ plan: '0.00', crm: '880.00', storage: '0.00' });
  });

  it('never touches the plan line (productId null), even if every product is targeted', () => {
    const r = applyDiscounts(lines, [rule({ scope: 'PRODUCTS', productIds: [1, 2], value: 10 })], ctx);
    expect(r.lineDiscounts.plan.toFixed(2)).toBe('0.00');
  });

  it('no matching line → not applied', () => {
    const r = applyDiscounts(lines, [rule({ scope: 'PRODUCTS', productIds: [99] })], ctx);
    expect(r.applied).toEqual([]);
  });

  it('fixed amount split across 3 matching lines sums exactly to the rule amount', () => {
    const three = [line('a', 1, 100), line('b', 2, 100), line('c', 3, 100)];
    const r = applyDiscounts(three, [rule({ scope: 'PRODUCTS', productIds: [1, 2, 3], type: 'FIXED', value: 100 })], ctx);
    expect(sum(Object.values(r.lineDiscounts)).toFixed(2)).toBe('100.00');
    expect(Object.values(r.lineDiscounts).map((v) => v.toFixed(2)).sort()).toEqual(['33.33', '33.33', '33.34']);
  });

  it('product discounts apply first, then the subscription discount on what is left', () => {
    const r = applyDiscounts(
      [line('plan', null, 1000), line('crm', 1, 1000)],
      [rule({ scope: 'PRODUCTS', productIds: [1], value: 50 }), rule({ scope: 'SUBSCRIPTION', value: 10 })],
      ctx,
    );
    // crm: 500 off, then 10% of the remaining 500 = 50 → 550; plan: 10% of 1000 = 100.
    expect(amounts(r)).toEqual({ plan: '100.00', crm: '550.00' });
    expect(r.applied).toHaveLength(2);
  });
});

describe('applyDiscounts: thresholds', () => {
  it('minQuantity met → applied', () => {
    const r = applyDiscounts(lines, [rule({ minQuantity: 8 })], ctx); // 5 + 1 + 2 = 8
    expect(r.applied).toHaveLength(1);
  });

  it('minQuantity not met → not applied', () => {
    const r = applyDiscounts(lines, [rule({ minQuantity: 9 })], ctx);
    expect(r.applied).toEqual([]);
  });

  it('minPurchaseAmount met vs not met', () => {
    expect(applyDiscounts(lines, [rule({ minPurchaseAmount: '2959.00' })], ctx).applied).toHaveLength(1);
    expect(applyDiscounts(lines, [rule({ minPurchaseAmount: '2959.01' })], ctx).applied).toEqual([]);
  });

  it('product-scope thresholds only count matching lines', () => {
    // Storage line alone: qty 2, amount 199. The plan's 5 seats must not count.
    const target = { scope: 'PRODUCTS' as const, productIds: [2] };
    expect(applyDiscounts(lines, [rule({ ...target, minQuantity: 2 })], ctx).applied).toHaveLength(1);
    expect(applyDiscounts(lines, [rule({ ...target, minQuantity: 3 })], ctx).applied).toEqual([]);
    expect(applyDiscounts(lines, [rule({ ...target, minPurchaseAmount: 200 })], ctx).applied).toEqual([]);
  });
});

describe('applyDiscounts: eligibility', () => {
  it('out of date range → not applied (dates inclusive)', () => {
    expect(applyDiscounts(lines, [rule({ startDate: d('2026-11-16') })], ctx).applied).toEqual([]);
    expect(applyDiscounts(lines, [rule({ endDate: d('2026-11-14') })], ctx).applied).toEqual([]);
    expect(applyDiscounts(lines, [rule({ startDate: d('2026-11-15'), endDate: d('2026-11-15') })], ctx).applied).toHaveLength(1);
  });

  it('inactive → not applied', () => {
    expect(applyDiscounts(lines, [rule({ isActive: false })], ctx).applied).toEqual([]);
  });

  it('exhausted → not applied; unlimited never exhausts', () => {
    expect(applyDiscounts(lines, [rule({ usageLimit: 3, timesUsed: 3 })], ctx).applied).toEqual([]);
    expect(applyDiscounts(lines, [rule({ usageLimit: 3, timesUsed: 2 })], ctx).applied).toHaveLength(1);
    expect(applyDiscounts(lines, [rule({ usageLimit: null, timesUsed: 500 })], ctx).applied).toHaveLength(1);
  });

  it('restricted to another customer → not applied; own customer → applied', () => {
    expect(applyDiscounts(lines, [rule({ customerIds: [2] })], ctx).applied).toEqual([]);
    expect(applyDiscounts(lines, [rule({ customerIds: [2, 1] })], ctx).applied).toHaveLength(1);
  });
});

describe('applyDiscounts: choosing between rules', () => {
  it('two subscription rules → only the better one applies', () => {
    const small = rule({ name: '5%', value: 5 });
    const big = rule({ name: '₹500 off', type: 'FIXED', value: 500 });
    const r = applyDiscounts(lines, [small, big], ctx);
    expect(r.applied).toEqual([{ ruleId: big.id, name: '₹500 off', amount: expect.anything() }]);
    expect(r.applied[0].amount.toFixed(2)).toBe('500.00');
  });

  it('two product rules on the same line → the better one per line', () => {
    const tenPct = rule({ scope: 'PRODUCTS', productIds: [1, 2], value: 10 });
    const flat = rule({ scope: 'PRODUCTS', productIds: [1], type: 'FIXED', value: 100 });
    const r = applyDiscounts(lines, [tenPct, flat], ctx);
    // crm: 10% = 176 beats 100; storage only matches the 10% rule.
    expect(amounts(r)).toEqual({ plan: '0.00', crm: '176.00', storage: '19.90' });
    expect(r.applied.map((a) => a.ruleId)).toEqual([tenPct.id]);
  });

  it('equal amounts → the lower rule id wins, so results are repeatable', () => {
    const first = rule({ value: 10 });
    const second = rule({ value: 10 });
    expect(applyDiscounts(lines, [second, first], ctx).applied[0].ruleId).toBe(first.id);
  });

  it('no rules or no lines → nothing applied, every line 0', () => {
    expect(applyDiscounts(lines, [], ctx)).toEqual({
      lineDiscounts: { plan: D(0), crm: D(0), storage: D(0) },
      applied: [],
    });
    expect(applyDiscounts([], [rule()], ctx).applied).toEqual([]);
  });
});

describe('splitProportionally', () => {
  it('parts sum exactly to the total and never exceed their weight', () => {
    const weights = [D('0.01'), D('999.99'), D('0.02'), D('333.33')];
    const parts = splitProportionally('777.77', weights);
    expect(sum(parts).toFixed(2)).toBe('777.77');
    parts.forEach((p, i) => expect(p.lessThanOrEqualTo(weights[i])).toBe(true));
  });

  it('zero weight lines get nothing', () => {
    const parts = splitProportionally(10, [D(0), D(50), D(50)]);
    expect(parts.map((p) => p.toFixed(2))).toEqual(['0.00', '5.00', '5.00']);
  });
});
