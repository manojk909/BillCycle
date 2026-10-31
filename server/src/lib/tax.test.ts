import { describe, expect, it } from 'vitest';
import { computeLine, sumTotals } from './tax';
import { round2, sum, toFixed2 } from './money';

const gst18 = { id: 1, name: 'GST 18%', type: 'PERCENT' as const, rate: 18 };
const gst5 = { id: 2, name: 'GST 5%', type: 'PERCENT' as const, rate: 5 };

describe('money', () => {
  it('rounds half up to 2 decimals', () => {
    expect(toFixed2(round2('0.005'))).toBe('0.01');
    expect(toFixed2(round2('2.675'))).toBe('2.68');
  });
  it('sums without float drift', () => {
    expect(toFixed2(sum([0.1, 0.2]))).toBe('0.30');
  });
});

describe('computeLine', () => {
  it('no tax', () => {
    const r = computeLine({ quantity: 2, unitPrice: '1760' });
    expect(toFixed2(r.untaxed)).toBe('3520.00');
    expect(toFixed2(r.tax)).toBe('0.00');
    expect(toFixed2(r.total)).toBe('3520.00');
  });

  it('18% GST', () => {
    const r = computeLine({ quantity: 1, unitPrice: '999', taxes: [gst18] });
    expect(toFixed2(r.tax)).toBe('179.82');
    expect(toFixed2(r.total)).toBe('1178.82');
  });

  it('two taxes on the same base', () => {
    const r = computeLine({ quantity: 1, unitPrice: 1000, taxes: [gst18, gst5] });
    expect(toFixed2(r.tax)).toBe('230.00');
    expect(r.breakdown.map((b) => toFixed2(b.amount))).toEqual(['180.00', '50.00']);
  });

  it('fixed tax is per unit', () => {
    const r = computeLine({
      quantity: 3,
      unitPrice: 100,
      taxes: [{ id: 3, name: 'Cess', type: 'FIXED', rate: 2 }],
    });
    expect(toFixed2(r.tax)).toBe('6.00');
  });

  it('tax is applied after discount', () => {
    const r = computeLine({ quantity: 10, unitPrice: 100, discountAmount: 100, taxes: [gst18] });
    expect(toFixed2(r.untaxed)).toBe('900.00');
    expect(toFixed2(r.tax)).toBe('162.00');
  });

  it('discount never makes a line negative', () => {
    expect(toFixed2(computeLine({ quantity: 1, unitPrice: 50, discountAmount: 80 }).untaxed)).toBe('0.00');
  });

  it('rounds each line', () => {
    expect(toFixed2(computeLine({ quantity: 3, unitPrice: '33.335' }).untaxed)).toBe('100.01');
  });

  it('rejects zero or fractional quantity', () => {
    expect(() => computeLine({ quantity: 0, unitPrice: 1 })).toThrow();
    expect(() => computeLine({ quantity: 1.5, unitPrice: 1 })).toThrow();
  });

  it('sumTotals adds rounded lines', () => {
    const t = sumTotals([
      computeLine({ quantity: 1, unitPrice: 999, taxes: [gst18] }),
      computeLine({ quantity: 2, unitPrice: 199, taxes: [gst18] }),
    ]);
    expect(toFixed2(t.untaxed)).toBe('1397.00');
    expect(toFixed2(t.tax)).toBe('251.46');
    expect(toFixed2(t.total)).toBe('1648.46');
  });
});
