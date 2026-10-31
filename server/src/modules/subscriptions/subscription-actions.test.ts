import { describe, it, expect } from 'vitest';
import type { SubscriptionState } from '@prisma/client';
import {
  assertTransition,
  getAllowedActions,
  TRANSITIONS,
  type SubscriptionAction,
} from './subscription-actions';
import { HttpError } from '../../lib/http-error';

const STATES: SubscriptionState[] = [
  'DRAFT',
  'QUOTATION',
  'CONFIRMED',
  'ACTIVE',
  'PAUSED',
  'CLOSED',
];
const ACTIONS: SubscriptionAction[] = [
  'send',
  'confirm',
  'activate',
  'pause',
  'resume',
  'renew',
  'close',
  'cancel',
];

describe('subscription state machine', () => {
  it('every valid transition passes; every invalid one throws INVALID_TRANSITION', () => {
    for (const from of STATES) {
      for (const action of ACTIONS) {
        const expected = TRANSITIONS[from][action];
        if (expected) {
          expect(assertTransition(from, action)).toBe(expected);
        } else {
          try {
            assertTransition(from, action);
            throw new Error(`expected ${from} x ${action} to throw`);
          } catch (err) {
            expect(err).toBeInstanceOf(HttpError);
            expect((err as HttpError).code).toBe('INVALID_TRANSITION');
            expect((err as HttpError).status).toBe(409);
          }
        }
      }
    }
  });

  it('CLOSED is terminal', () => {
    for (const action of ACTIONS) {
      expect(TRANSITIONS.CLOSED[action]).toBeUndefined();
    }
  });

  it('getAllowedActions filters by plan flags', () => {
    const base = { pausable: false, closable: true, renewable: true };
    const active = getAllowedActions({ state: 'ACTIVE' }, base, 'ADMIN');
    expect(active).toContain('renew');
    expect(active).toContain('close');
    expect(active).not.toContain('pause'); // not pausable

    const pausable = getAllowedActions({ state: 'ACTIVE' }, { ...base, pausable: true }, 'ADMIN');
    expect(pausable).toContain('pause');

    const notClosable = getAllowedActions(
      { state: 'ACTIVE' },
      { ...base, closable: false },
      'ADMIN',
    );
    expect(notClosable).not.toContain('close');
  });

  it('draft can send/confirm/cancel; quotation can confirm/cancel', () => {
    expect(getAllowedActions({ state: 'DRAFT' }, { pausable: true, closable: true, renewable: true }, 'ADMIN')).toEqual(
      ['send', 'confirm', 'cancel'],
    );
    expect(
      getAllowedActions({ state: 'QUOTATION' }, { pausable: true, closable: true, renewable: true }, 'ADMIN'),
    ).toEqual(['confirm', 'cancel']);
  });
});
