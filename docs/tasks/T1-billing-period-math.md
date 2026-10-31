---
id: T1
title: "Billing period math library (lib/period.ts) with unit tests"
assignee: trivedhchalla
milestone: P1 Masters & Core
labels: area:billing, type:feature, priority:must, independent
depends:
---
## Goal
Correct billing-period dates are the base of "nothing billed twice or skipped". This is a **pure TypeScript module** with tests. It needs no DB, no server running, and nobody else's code, so it can be built anywhere.

## Read first
`docs/04-business-rules.md` §4 "Periods", `docs/06-research-notes.md` §2 (billing cycle anchor)

## Build `server/src/lib/period.ts` + `server/src/lib/period.test.ts`
```ts
export type BillingPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

/** Start of the next period. anchorDay = day-of-month of the original start (keeps Jan 31 → Feb 28 → Mar 31). */
export function addPeriod(date: Date, period: BillingPeriod, interval?: number, anchorDay?: number): Date;

/** Last day (inclusive) of the period that starts on `start`. = addPeriod(start) − 1 day */
export function periodEnd(start: Date, period: BillingPeriod, interval?: number, anchorDay?: number): Date;

/** All period starts from `from` (inclusive) while start <= `upTo`. Used for catch-up billing. */
export function periodStartsUntil(from: Date, upTo: Date, period: BillingPeriod, interval?: number, anchorDay?: number): Date[];

/** Multiply a per-period amount by this to get a monthly amount (MRR). DAILY 365/12, WEEKLY 52/12, MONTHLY 1, YEARLY 1/12, all ÷ interval */
export function toMonthlyFactor(period: BillingPeriod, interval?: number): number;

export function formatPeriodLabel(period: BillingPeriod, interval?: number): string; // "month", "3 months", "year", "week", "2 weeks"
```
Rules: work in **UTC date-only** (time 00:00:00Z). Never mutate inputs. `interval` default 1, must be an integer ≥ 1 (throw otherwise).

## Acceptance criteria (Vitest, ≥ 15 cases)
- [ ] Monthly: Jan 15 → Feb 15; **Jan 31 → Feb 28 (2027) / Feb 29 (2028) → Mar 31** (with anchor 31)
- [ ] Yearly: Feb 29 2028 → Feb 28 2029
- [ ] Weekly / daily / interval 3 months / interval 2 weeks
- [ ] `periodEnd(Jan 1, MONTHLY)` = Jan 31; `periodEnd(Mar 1, YEARLY)` = Feb 28/29 next year
- [ ] `periodStartsUntil` returns 3 starts for a daily plan 3 days behind, and `[]` when `from > upTo`
- [ ] Inputs are not mutated
- [ ] `npm test` passes in `server/`

## Notes
If the server package (M1) isn't merged yet, develop in a temporary folder with `vitest` and copy the two files in. The code has no dependencies.
Consumers: SK4/SK5 (billing), M11 (MRR), M4/S5 (labels).
