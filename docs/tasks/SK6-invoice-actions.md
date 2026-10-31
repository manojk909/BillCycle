---
id: SK6
title: "Invoice API and actions: list, detail, confirm, cancel, send, print data"
assignee: ShubhamKang
milestone: P2 Money Flow
labels: area:invoicing, type:feature, priority:must
depends: SK4
---
## Goal
"The team can confirm, cancel, send or print any invoice, and each invoice moves from Draft to Confirmed to Paid."

## Read first
`docs/03-domain-model.md` (Invoice state machine), `docs/04-business-rules.md` §10, `docs/tasks/T2-invoice-print-view.md` (`InvoicePrintData` shape), `docs/tasks/T3-email-templates.md`

## Build `server/src/modules/invoices/` (staff)
- `GET /api/invoices?page&limit&q&state&status=draft|outstanding|overdue|paid|partial&customerId&subscriptionId&from&to` (status uses M10 `paymentStatus` logic as SQL conditions)
- `GET /api/invoices/:id` (lines, taxes, payments, subscription number, `allowedActions`)
- `PATCH /api/invoices/:id`: only `DRAFT` (edit line qty, price, description; dates); recompute totals
- `POST /api/invoices/:id/confirm` → `DRAFT → CONFIRMED`; assigns `nextNumber(tx, 'INV', invoiceDate)`; `confirmedAt`; immutable after
- `POST /api/invoices/:id/cancel` → from `DRAFT` or `CONFIRMED` only if `amountPaid = 0`; S8 `releaseUsage`; `cancelledAt`
- `POST /api/invoices/:id/send` → must be `CONFIRMED`/`PAID`; email via M6 `sendMail` + T3 `invoiceSentEmail` (link to the portal invoice); sets `sentAt`
- `GET /api/invoices/:id/print-data` → `InvoicePrintData` (shape in T2). Builder in `invoice-print-data.ts`, **exported** for the M13 portal
- Export `confirmInvoice(tx, id, actor)` and `cancelInvoice(tx, id, actor)` service functions (SK5 auto-confirm uses them)
- `POST /api/invoices/bulk-confirm { ids[] }` for billing-day review

## Acceptance criteria
- [ ] Draft has no number; confirm assigns sequential `INV/2026/00001`, `00002`…
- [ ] Editing a confirmed invoice → 409
- [ ] Cancel with a payment → 409 with message; cancel releases discount usage
- [ ] Send email visible in Mailpit
- [ ] Status filters return correct sets (overdue = confirmed, unpaid, due < today)
