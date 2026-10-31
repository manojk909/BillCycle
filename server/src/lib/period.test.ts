import { describe, expect, it } from 'vitest';
import { addPeriod, periodEnd, periodStartsUntil, toMonthlyFactor, formatPeriodLabel } from './period';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

describe('addPeriod', () => {
  it('monthly: Jan 15 -> Feb 15', () => {
    expect(iso(addPeriod(d('2027-01-15'), 'MONTHLY'))).toBe('2027-02-15');
  });

  it('monthly: Jan 31 -> Feb 28 in a non-leap year', () => {
    expect(iso(addPeriod(d('2027-01-31'), 'MONTHLY'))).toBe('2027-02-28');
  });

  it('monthly: Jan 31 -> Feb 29 in a leap year', () => {
    expect(iso(addPeriod(d('2028-01-31'), 'MONTHLY'))).toBe('2028-02-29');
  });

  it('monthly: chaining with explicit anchorDay keeps Jan 31 -> Feb 28 -> Mar 31', () => {
    const feb28 = addPeriod(d('2027-01-31'), 'MONTHLY', 1, 31);
    expect(iso(feb28)).toBe('2027-02-28');
    const mar31 = addPeriod(feb28, 'MONTHLY', 1, 31);
    expect(iso(mar31)).toBe('2027-03-31');
  });

  it('monthly: without anchorDay, the clamped day propagates (Feb 28 -> Mar 28)', () => {
    const feb28 = addPeriod(d('2027-01-31'), 'MONTHLY');
    expect(iso(addPeriod(feb28, 'MONTHLY'))).toBe('2027-03-28');
  });

  it('monthly: interval 3 months', () => {
    expect(iso(addPeriod(d('2027-01-15'), 'MONTHLY', 3))).toBe('2027-04-15');
  });

  it('monthly: crosses a year boundary', () => {
    expect(iso(addPeriod(d('2027-12-15'), 'MONTHLY'))).toBe('2028-01-15');
  });

  it('yearly: Feb 29 2028 -> Feb 28 2029', () => {
    expect(iso(addPeriod(d('2028-02-29'), 'YEARLY'))).toBe('2029-02-28');
  });

  it('yearly: regular date adds a full year', () => {
    expect(iso(addPeriod(d('2027-06-10'), 'YEARLY'))).toBe('2028-06-10');
  });

  it('weekly: adds 7 days', () => {
    expect(iso(addPeriod(d('2027-01-01'), 'WEEKLY'))).toBe('2027-01-08');
  });

  it('weekly: interval 2 weeks', () => {
    expect(iso(addPeriod(d('2027-01-01'), 'WEEKLY', 2))).toBe('2027-01-15');
  });

  it('daily: adds 1 day', () => {
    expect(iso(addPeriod(d('2027-01-01'), 'DAILY'))).toBe('2027-01-02');
  });

  it('daily: interval of several days', () => {
    expect(iso(addPeriod(d('2027-01-01'), 'DAILY', 5))).toBe('2027-01-06');
  });

  it('throws on interval 0', () => {
    expect(() => addPeriod(d('2027-01-01'), 'DAILY', 0)).toThrow();
  });

  it('throws on a non-integer interval', () => {
    expect(() => addPeriod(d('2027-01-01'), 'DAILY', 1.5)).toThrow();
  });

  it('throws on a negative interval', () => {
    expect(() => addPeriod(d('2027-01-01'), 'MONTHLY', -1)).toThrow();
  });

  it('does not mutate the input date', () => {
    const input = d('2027-01-31');
    const before = input.getTime();
    addPeriod(input, 'MONTHLY');
    expect(input.getTime()).toBe(before);
  });
});

describe('periodEnd', () => {
  it('periodEnd(Jan 1, MONTHLY) = Jan 31', () => {
    expect(iso(periodEnd(d('2027-01-01'), 'MONTHLY'))).toBe('2027-01-31');
  });

  it('periodEnd(Mar 1, YEARLY) = Feb 28/29 next year', () => {
    expect(iso(periodEnd(d('2027-03-01'), 'YEARLY'))).toBe('2028-02-29');
    expect(iso(periodEnd(d('2028-03-01'), 'YEARLY'))).toBe('2029-02-28');
  });

  it('periodEnd for a weekly period', () => {
    expect(iso(periodEnd(d('2027-01-01'), 'WEEKLY'))).toBe('2027-01-07');
  });

  it('does not mutate the input date', () => {
    const input = d('2027-01-01');
    const before = input.getTime();
    periodEnd(input, 'MONTHLY');
    expect(input.getTime()).toBe(before);
  });
});

describe('periodStartsUntil', () => {
  it('returns 3 starts for a daily plan 3 days behind', () => {
    const starts = periodStartsUntil(d('2027-01-01'), d('2027-01-03'), 'DAILY');
    expect(starts.map(iso)).toEqual(['2027-01-01', '2027-01-02', '2027-01-03']);
  });

  it('returns [] when from > upTo', () => {
    expect(periodStartsUntil(d('2027-01-05'), d('2027-01-01'), 'DAILY')).toEqual([]);
  });

  it('returns a single start when from === upTo', () => {
    expect(periodStartsUntil(d('2027-01-01'), d('2027-01-01'), 'MONTHLY').map(iso)).toEqual(['2027-01-01']);
  });

  it('catches up several missed monthly periods, keeping the anchor day fixed', () => {
    const starts = periodStartsUntil(d('2027-01-31'), d('2027-04-01'), 'MONTHLY');
    expect(starts.map(iso)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
  });
});

describe('toMonthlyFactor', () => {
  it('monthly factor is 1', () => {
    expect(toMonthlyFactor('MONTHLY')).toBe(1);
  });

  it('yearly factor is 1/12', () => {
    expect(toMonthlyFactor('YEARLY')).toBeCloseTo(1 / 12, 10);
  });

  it('daily factor is 365/12', () => {
    expect(toMonthlyFactor('DAILY')).toBeCloseTo(365 / 12, 10);
  });

  it('weekly factor is 52/12', () => {
    expect(toMonthlyFactor('WEEKLY')).toBeCloseTo(52 / 12, 10);
  });

  it('divides by interval', () => {
    expect(toMonthlyFactor('MONTHLY', 3)).toBeCloseTo(1 / 3, 10);
  });
});

describe('formatPeriodLabel', () => {
  it('formats interval 1 as the bare unit', () => {
    expect(formatPeriodLabel('MONTHLY')).toBe('month');
    expect(formatPeriodLabel('YEARLY')).toBe('year');
    expect(formatPeriodLabel('WEEKLY')).toBe('week');
    expect(formatPeriodLabel('DAILY')).toBe('day');
  });

  it('pluralizes for interval > 1', () => {
    expect(formatPeriodLabel('MONTHLY', 3)).toBe('3 months');
    expect(formatPeriodLabel('WEEKLY', 2)).toBe('2 weeks');
  });
});
