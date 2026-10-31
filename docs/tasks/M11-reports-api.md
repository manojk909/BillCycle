---
id: M11
title: "Reports API: KPIs, MRR, revenue trend, overdue aging"
assignee: manojk909
milestone: P3 Insight & Portal
labels: area:reports, area:perf, type:feature, priority:must
depends: M10, SK5
---
## Goal
Scene G: answer "how many active, how much came in, how much is owed, what's overdue" instantly, even with thousands of subscriptions.

## Read first
`docs/06-research-notes.md` §4 (metric definitions) and §5 (performance)

## Build `modules/reports/` (staff). Common filters: `from, to, planId, customerId`
| Endpoint | Returns |
|---|---|
| `GET /api/reports/summary` | `activeSubscriptions, pausedSubscriptions, newSubscriptions, closedSubscriptions, mrr, arr, invoicedAmount, collectedAmount, outstandingAmount, overdueAmount, overdueCount` |
| `GET /api/reports/revenue-trend?months=12` | `[{ month: "2026-05", invoiced, collected }]` |
| `GET /api/reports/overdue?page&limit` | rows `{ invoiceId, number, customer, dueDate, daysOverdue, amountDue }` + `buckets: { d1_30, d31_60, d61_90, d90_plus }` |
| `GET /api/reports/by-plan` | `[{ planId, plan, active, mrr }]` |

- Use **SQL aggregates** (`prisma.$queryRaw` with `SUM(...) FILTER (WHERE ...)`, `date_trunc('month', ...)`). No loading rows into JS to sum them
- MRR = Σ active subscriptions' recurring untaxed amount × monthly factor (use T1's `toMonthlyFactor` if merged, else the inline map DAILY 365/12, WEEKLY 52/12, MONTHLY 1, YEARLY 1/12, ÷ interval)
- Collected = Σ payments by payment date in range. Invoiced = Σ confirmed/paid invoice totals by invoice date
- Add any indexes the queries need (small schema PR)

## Acceptance criteria
- [ ] Numbers match a manual check on seed data (document the check in the PR)
- [ ] Each endpoint < 300 ms on the T4 perf dataset (record timings in `docs/perf-report.md`)
- [ ] Filters combine correctly
