---
id: M12
title: Dashboard UI with KPIs, charts, filters and drill-down
assignee: manojk909
milestone: P3 Insight & Portal
labels: area:reports, area:ui, type:feature, priority:must
depends: M11, M4
---
## Goal
"One place to see active subscriptions, revenue, payments and overdue invoices, with filters and a summary view." The landing page for staff.

## Build `client/src/features/dashboard/`
- Filter bar: date range presets (This month, Last month, This quarter, YTD, Custom), plan select, customer picker. Filters live in URL query params (shareable)
- KPI cards: Active subscriptions, MRR (+ ARR subtitle), Collected, Outstanding, Overdue (red, with count)
- Charts (Recharts): Invoiced vs Collected by month (bar), MRR by plan (bar or donut)
- Tables: top overdue invoices (with aging badge), recent payments
- Every card and row drills down (e.g. Overdue → `/app/invoices?status=overdue`)
- Skeleton loaders; auto-refresh every 60 s (TanStack `refetchInterval`)

## Acceptance criteria
- [ ] Changing a filter updates all widgets
- [ ] Drill-down lists show the same totals as the card
- [ ] Loads < 2 s on the perf dataset
- [ ] Looks clean and consistent with the UI kit (no ad-hoc colours)
