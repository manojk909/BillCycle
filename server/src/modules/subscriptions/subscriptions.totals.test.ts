import { describe, it, expect } from 'vitest';
import { computeLine, sumTotals, type TaxInput } from '../../lib/tax';
import { toFixed2 } from '../../lib/money';

// SK1: the header totals must equal the sum of the ACTIVE lines, and each line
// matches a hand calculation. recomputeSubscription() delegates to these helpers,
// so this locks the arithmetic contract the DB function relies on.

const gst18: TaxInput = { id: 1, name: 'GST 18%', type: 'PERCENT', rate: 18 };

describe('subscription totals', () => {
  it('plan line: 999 x 3 @ 18% GST', () => {
    const line = computeLine({ quantity: 3, unitPrice: '999.00', taxes: [gst18] });
    // 999 * 3 = 2997 untaxed; tax = 2997 * 0.18 = 539.46; total = 3536.46
    expect(toFixed2(line.untaxed)).toBe('2997.00');
    expect(toFixed2(line.tax)).toBe('539.46');
    expect(toFixed2(line.total)).toBe('3536.46');
  });

  it('header = sum of active lines only', () => {
    const planLine = computeLine({ quantity: 2, unitPrice: '500.00', taxes: [gst18] }); // 1000 + 180
    const activeAddon = computeLine({ quantity: 1, unitPrice: '200.00', taxes: [gst18] }); // 200 + 36
    // inactive add-on is excluded from the header entirely
    const header = sumTotals([planLine, activeAddon]);
    expect(toFixed2(header.untaxed)).toBe('1200.00');
    expect(toFixed2(header.tax)).toBe('216.00');
    expect(toFixed2(header.total)).toBe('1416.00');
  });

  it('no taxes → tax is zero and total equals untaxed', () => {
    const line = computeLine({ quantity: 4, unitPrice: '250.00' });
    expect(toFixed2(line.untaxed)).toBe('1000.00');
    expect(toFixed2(line.tax)).toBe('0.00');
    expect(toFixed2(line.total)).toBe('1000.00');
  });
});
