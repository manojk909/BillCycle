---
id: SK5
title: Billing run (batch, catch-up, report) and daily scheduler jobs
assignee: ShubhamKang
milestone: P2 Money Flow
labels: area:billing, type:feature, priority:must
depends: SK4
---
## Goal
"Hundreds of subscriptions are due at once. Nobody should be typing invoices by hand." Plus automatic lifecycle (activate, auto-close, expire quotations).

## Read first
`docs/04-business-rules.md` §4 (billing run pseudo-code) and §8 (daily jobs)

## Build
**`server/src/jobs/billing-run.ts`**: `runBilling({ upTo: Date, triggeredById? })`
- Creates a `BillingRun` row; selects due subscriptions in batches of 200 (`state = ACTIVE AND nextInvoiceDate <= upTo`, ordered by id, keyset pagination)
- Per subscription: **its own transaction**, loop while `nextInvoiceDate <= upTo` and `(expiryDate is null or nextInvoiceDate <= expiryDate)` → `generateInvoiceForPeriod` (catch-up: never skip a missed period)
- One failure doesn't stop the run; collect `{ subscriptionId, error }`
- Optional setting `AUTO_CONFIRM_INVOICES` → call SK6 `confirmInvoice` after creation
- Concurrency: a Postgres advisory lock (`pg_try_advisory_lock`) so two runs can't overlap → second returns `409 BILLING_RUN_IN_PROGRESS`
- Updates the `BillingRun` with counts and finish time

**`server/src/jobs/lifecycle.ts`**: `activateDue()`, `autoCloseExpired()` (plan.autoClose and expiryDate < today → SK2 `closeSubscription(…, 'system', 'Expired')`), `expireQuotations()` (flag only)

**`server/src/jobs/scheduler.ts`**: node-cron `0 1 * * *` runs activate → billing(today) → autoClose → expireQuotations when `SCHEDULER_ENABLED=true`

**API** `modules/invoices/` or `modules/billing/`: `POST /api/billing/run { upTo }`, `GET /api/billing/runs` (paginated), `GET /api/billing/preview?upTo=` (count of subscriptions and periods due)

**UI** `client/src/features/invoices/billing-run-page.tsx` (`/app/billing`): date picker, "Preview" (shows N due) → "Run billing" → result card (created / skipped / failed with reasons), history table

## Acceptance criteria
- [ ] Run twice for the same date → second run creates 0 invoices (**demo proof**)
- [ ] Daily plan last billed 3 days ago → run creates 3 invoices
- [ ] 1,000 due subscriptions run in < 60 s, and the UI stays responsive
- [ ] Auto-close closes only plans with `autoClose`
- [ ] Two parallel run requests → one gets 409
