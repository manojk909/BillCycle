---
id: SK7
title: "Invoices UI: list with status tabs, form, actions, print"
assignee: ShubhamKang
milestone: P2 Money Flow
labels: area:invoicing, area:ui, type:feature, priority:must
depends: SK6, M4, T2
---
## Goal
At any moment the team can see which invoices are paid, outstanding or overdue, and act on them.

## Build `client/src/features/invoices/`
- **List** `/app/invoices`: tabs All / Draft / Outstanding / Overdue / Partially paid / Paid / Cancelled with counts; search (number/customer), filters (date range, customer, subscription), select rows → "Confirm selected"; columns number, customer, invoice date, due date (red if overdue + "12 days overdue"), total, amount due, status badge
- **Form** `/app/invoices/:id`: `StatusBar` (Draft → Confirmed → Paid), buttons Confirm / Cancel / Send / Print / **Register payment** (import M10's modal), bill-to block, period, lines with discount and taxes columns, totals box (untaxed, discount, tax, total, paid, due), payments history (M10 component), link to the subscription
- Editable lines only in Draft
- **Print** `/app/invoices/:id/print` renders T2's `InvoicePrint` with `/print-data`, then `window.print()`

## Acceptance criteria
- [ ] Billing day flow: run billing → Draft tab shows new invoices → bulk confirm → Outstanding
- [ ] Overdue tab matches the dashboard overdue count
- [ ] Print preview is a clean A4 page
- [ ] Actions disabled or hidden per state, with confirm dialogs for cancel
