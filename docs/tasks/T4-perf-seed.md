---
id: T4
title: Performance seed (10k subscriptions) and performance report
assignee: trivedhchalla
milestone: P3 Insight & Portal
labels: area:perf, type:chore, priority:must
depends: M2
---
## Goal
Prove "with thousands of subscriptions on the books, every page should still respond in under two seconds."

## Read first
`docs/06-research-notes.md` §5, `server/prisma/schema.prisma` (after M2)

## Build `server/prisma/seed-perf.ts` (script `npm run seed:perf`)
- Runs after the base seed. Uses `createMany` in batches of 1,000 inside transactions; no external faker service (a small local generator is fine; the `@faker-js/faker` npm package is allowed)
- Volume: ~2,000 customers, ~10,000 subscriptions (state mix: 70% ACTIVE, 8% PAUSED, 12% CLOSED, 5% QUOTATION, 5% DRAFT) across all seeded plans, 1–3 lines each; ~60,000 invoices covering the last 12 months (realistic periods per plan); payments for ~85% of confirmed invoices (some partial), leaving ~5% overdue
- Totals must be consistent (line sums = invoice totals; amountPaid = Σ payments)
- Prints elapsed time per step. Re-runnable (`--reset` flag clears perf data only, marked by an email domain like `@perf.billcycle.local`)

## Report `docs/perf-report.md`
For each main page and API (subscriptions list, invoices list + overdue tab, dashboard summary, customer list search, portal invoices), record response time (browser DevTools or `curl -w "%{time_total}"`), the query plan of the slowest one (`EXPLAIN ANALYZE`), and any index suggestions. Give the suggestions to Manoj (schema owner).

## Acceptance criteria
- [ ] Seed completes in < 3 minutes on a laptop
- [ ] Data passes consistency checks (SQL queries included in the report)
- [ ] Report lists timings for every page above
