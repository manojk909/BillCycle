import { describe, expect, it } from 'vitest';
import { HttpError } from '../../lib/http-error';
import { assertPlanAllows, isPlanAvailable } from './plans.rules';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('isPlanAvailable', () => {
  it('is always available when both bounds are null', () => {
    expect(isPlanAvailable({ startDate: null, endDate: null }, d('1999-01-01'))).toBe(true);
    expect(isPlanAvailable({ startDate: null, endDate: null }, d('2099-12-31'))).toBe(true);
  });

  it('only a start date: open-ended into the future', () => {
    const plan = { startDate: d('2027-01-01'), endDate: null };
    expect(isPlanAvailable(plan, d('2026-12-31'))).toBe(false);
    expect(isPlanAvailable(plan, d('2027-01-01'))).toBe(true);
    expect(isPlanAvailable(plan, d('2040-06-15'))).toBe(true);
  });

  it('only an end date: available from the past until the end', () => {
    const plan = { startDate: null, endDate: d('2027-03-31') };
    expect(isPlanAvailable(plan, d('2000-01-01'))).toBe(true);
    expect(isPlanAvailable(plan, d('2027-03-31'))).toBe(true);
    expect(isPlanAvailable(plan, d('2027-04-01'))).toBe(false);
  });

  it('both bounds are inclusive', () => {
    const plan = { startDate: d('2027-01-01'), endDate: d('2027-01-31') };
    expect(isPlanAvailable(plan, d('2027-01-01'))).toBe(true);
    expect(isPlanAvailable(plan, d('2027-01-31'))).toBe(true);
    expect(isPlanAvailable(plan, d('2026-12-31'))).toBe(false);
    expect(isPlanAvailable(plan, d('2027-02-01'))).toBe(false);
  });

  it('a single-day window works', () => {
    const plan = { startDate: d('2027-05-05'), endDate: d('2027-05-05') };
    expect(isPlanAvailable(plan, d('2027-05-05'))).toBe(true);
    expect(isPlanAvailable(plan, d('2027-05-06'))).toBe(false);
  });

  it('ignores the time of day on the date being checked', () => {
    const plan = { startDate: null, endDate: d('2027-01-31') };
    expect(isPlanAvailable(plan, new Date('2027-01-31T23:59:59.000Z'))).toBe(true);
    expect(isPlanAvailable(plan, '2027-01-31')).toBe(true);
  });

  it('an archived plan is never available', () => {
    expect(isPlanAvailable({ startDate: null, endDate: null, isActive: false }, d('2027-01-01'))).toBe(false);
  });
});

describe('assertPlanAllows', () => {
  const plan = { name: 'Starter Monthly', pausable: false, closable: true, renewable: true };

  it('passes when the option is on', () => {
    expect(() => assertPlanAllows(plan, 'close')).not.toThrow();
    expect(() => assertPlanAllows(plan, 'renew')).not.toThrow();
  });

  it('throws 422 PLAN_ACTION_NOT_ALLOWED with a readable message when the option is off', () => {
    try {
      assertPlanAllows(plan, 'pause');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(422);
      expect((err as HttpError).code).toBe('PLAN_ACTION_NOT_ALLOWED');
      expect((err as HttpError).message).toBe(`Subscriptions on the "Starter Monthly" plan can't be paused`);
    }
  });

  it('covers close and renew too', () => {
    expect(() => assertPlanAllows({ ...plan, closable: false }, 'close')).toThrow(/closed early/);
    expect(() => assertPlanAllows({ ...plan, renewable: false }, 'renew')).toThrow(/renewed/);
  });
});
