import { describe, expect, it } from 'vitest';
import { discountStatus } from './discounts.status';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const today = d('2026-11-15');
const rule = { isActive: true, startDate: d('2026-11-01'), endDate: d('2026-11-30'), usageLimit: 10, timesUsed: 3 };

describe('discountStatus', () => {
  it('active inside the window with uses left', () => {
    expect(discountStatus(rule, today)).toBe('active');
  });

  it('scheduled before the start date', () => {
    expect(discountStatus({ ...rule, startDate: d('2026-11-16') }, today)).toBe('scheduled');
  });

  it('expired after the end date', () => {
    expect(discountStatus({ ...rule, endDate: d('2026-11-14') }, today)).toBe('expired');
  });

  it('exhausted when the usage limit is reached', () => {
    expect(discountStatus({ ...rule, timesUsed: 10 }, today)).toBe('exhausted');
  });

  it('inactive when switched off, whatever the dates', () => {
    expect(discountStatus({ ...rule, isActive: false }, today)).toBe('inactive');
  });

  it('start and end dates are inclusive', () => {
    expect(discountStatus({ ...rule, startDate: today }, today)).toBe('active');
    expect(discountStatus({ ...rule, endDate: today }, today)).toBe('active');
  });

  it('no usage limit never exhausts', () => {
    expect(discountStatus({ ...rule, usageLimit: null, timesUsed: 9999 }, today)).toBe('active');
  });

  it('exhausted wins over expired', () => {
    expect(discountStatus({ ...rule, timesUsed: 10, endDate: d('2026-01-01') }, today)).toBe('exhausted');
  });
});
