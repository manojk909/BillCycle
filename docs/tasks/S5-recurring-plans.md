---
id: S5
title: Recurring plans with billing period, min quantity, availability and options (API + UI)
assignee: Sandhya-Parmar09
milestone: P1 Masters & Core
labels: area:plans, type:feature, priority:must
depends: M2, M3, M4, S4
---
## Goal
Scene B: "what it costs and how often it bills (daily, weekly, monthly or yearly), the minimum quantity, and the dates it is available. Some plans should close on their own when they end, and others can be closed early, paused or renewed."

## Read first
`docs/03-domain-model.md` (RecurringPlan), `docs/07-assumptions-open-questions.md` A3 (plan price = base-fee line, qty = seats ≥ min quantity)

## Build
**API** `modules/plans/` (write: ADMIN; read: staff)
- Fields: `name, price, billingPeriod, billingInterval (1–12), minQuantity (≥1), startDate?, endDate?, autoClose, closable, pausable, renewable, taxIds[], isActive`
- `GET /api/plans?page&limit&q&billingPeriod&availableOn=YYYY-MM-DD` (`availableOn` → only plans where start ≤ date ≤ end, nulls = open)
- `GET /api/plans/:id` includes `activeSubscriptions` count
- `POST`, `PATCH`, `DELETE` (409 if used, so archive instead)
- `GET /api/plans/options?availableOn=` for pickers
- Export `isPlanAvailable(plan, date)` and `assertPlanAllows(plan, action: 'pause'|'close'|'renew')` from `plans.service.ts` (**SK1/SK2 import these**)
- Validation: `endDate ≥ startDate`, price ≥ 0. Changing `minQuantity` doesn't affect existing subscriptions

**UI** `features/plans/`
- List: name, price / period ("₹999 / month"), min qty, availability, option badges (Auto-close, Pausable…), active subs count
- Form: grouped sections "Pricing", "Availability", "Behaviour" (4 switches with a one-line help text each), plan taxes

## Acceptance criteria
- [ ] `availableOn` filter excludes expired and future plans
- [ ] `endDate` before `startDate` → inline error
- [ ] `assertPlanAllows` throws `422 PLAN_ACTION_NOT_ALLOWED` with a readable message
- [ ] Vitest for `isPlanAvailable` (null bounds, edge dates)
