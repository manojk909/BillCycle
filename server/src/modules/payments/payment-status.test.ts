import { describe, expect, it } from 'vitest';
import { paymentStatus } from './payment-status';

const today = new Date('2026-10-31T00:00:00Z');
const inv = (over: Partial<Parameters<typeof paymentStatus>[0]>) => ({
  state: 'CONFIRMED' as const,
  amountPaid: '0',
  amountDue: '100',
  dueDate: new Date('2026-11-15T00:00:00Z'),
  ...over,
});

describe('paymentStatus', () => {
  it('passes through draft, cancelled and paid', () => {
    expect(paymentStatus(inv({ state: 'DRAFT' }), today)).toBe('DRAFT');
    expect(paymentStatus(inv({ state: 'CANCELLED' }), today)).toBe('CANCELLED');
    expect(paymentStatus(inv({ state: 'PAID', amountDue: '0' }), today)).toBe('PAID');
  });
  it('outstanding when unpaid and not yet due', () => {
    expect(paymentStatus(inv({}), today)).toBe('OUTSTANDING');
  });
  it('due today is not overdue', () => {
    expect(paymentStatus(inv({ dueDate: today }), today)).toBe('OUTSTANDING');
  });
  it('overdue after the due date, even when partly paid', () => {
    const due = new Date('2026-10-16T00:00:00Z');
    expect(paymentStatus(inv({ dueDate: due }), today)).toBe('OVERDUE');
    expect(paymentStatus(inv({ dueDate: due, amountPaid: '40', amountDue: '60' }), today)).toBe('OVERDUE');
  });
  it('partial when some money came in before the due date', () => {
    expect(paymentStatus(inv({ amountPaid: '40', amountDue: '60' }), today)).toBe('PARTIAL');
  });
  it('confirmed with nothing due counts as paid', () => {
    expect(paymentStatus(inv({ amountPaid: '100', amountDue: '0' }), today)).toBe('PAID');
  });
});
