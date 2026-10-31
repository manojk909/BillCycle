---
id: M10
title: Payments API and UI (record payment, paid / outstanding / overdue)
assignee: manojk909
milestone: P2 Money Flow
labels: area:payments, type:feature, priority:must
depends: SK6, S4
---
## Goal
Scene F: record each payment (method, amount, date, note) against the right invoice. Always know what is paid, outstanding or overdue.

## Read first
`docs/04-business-rules.md` §7, `docs/03-domain-model.md` (Invoice state machine)

## Build
**API** `modules/payments/` (staff)
- `POST /api/invoices/:id/payments { methodId, amount, date, note? }` in one transaction: `SELECT … FOR UPDATE` the invoice; invoice must be `CONFIRMED`; `0 < amount ≤ amountDue`; `date` not in the future; insert payment; recompute `amountPaid`, `amountDue`; if `amountDue == 0` → `PAID`; `logActivity`
- `DELETE /api/payments/:id` (ADMIN only) → recompute; `PAID` → back to `CONFIRMED`
- `GET /api/payments?page&limit&from&to&methodId&customerId&q` (joins invoice number + customer name)
- `GET /api/invoices/:id/payments`
- Export `paymentStatus(invoice, today)` → `PAID | PARTIAL | OUTSTANDING | OVERDUE` in `modules/payments/payment-status.ts` (SK7 and M11 reuse it)

**UI** `features/payments/`
- "Register payment" modal (opened from the invoice form, SK7 imports it): method select, amount prefilled with `amountDue`, date default today, note
- Payments list page with filters and total of the filtered rows
- Payment history table component for the invoice form

## Acceptance criteria
- [ ] Partial (40%) then rest (60%) → invoice `PAID`
- [ ] Overpay, zero/negative amount, paying a DRAFT or CANCELLED invoice → 422 with a clear message
- [ ] Two simultaneous payments can't push `amountPaid` above the total (row lock)
- [ ] Deleting a payment reverts the state correctly
- [ ] Vitest for `paymentStatus`
