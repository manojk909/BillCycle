---
id: SK4
title: Invoice generation service from subscription (idempotent, taxes + discounts)
assignee: ShubhamKang
milestone: P2 Money Flow
labels: area:invoicing, type:feature, priority:must
depends: SK2, S8, T1
---
## Goal
Billing day: "Each one should be created from its subscription, with the customer details, product lines, taxes and totals already filled in. … Nothing should be billed twice or skipped."

## Read first
`docs/04-business-rules.md` §3–5 (**core rules**), `docs/03-domain-model.md` (Invoice, InvoiceLine), `docs/tasks/S8-discount-engine.md` (engine API), `docs/tasks/T1-billing-period-math.md` (date API)

## Build `server/src/modules/invoices/invoice-generator.ts`
```ts
generateInvoiceForPeriod(tx, subscriptionId: number, periodStart: Date): Promise<{ status: 'created' | 'skipped'; invoiceId?: number }>
```
Steps inside the caller's transaction:
1. `SELECT … FOR UPDATE` the subscription; must be `ACTIVE` (not paused)
2. If a non-cancelled invoice exists for `(subscriptionId, periodStart)` → `skipped`
3. `periodEnd = periodEnd(periodStart, plan.billingPeriod, plan.billingInterval)` (T1)
4. Lines = plan line + **active** add-on lines; untaxed per line
5. `loadCandidateRules` + `applyDiscounts` (S8) → per-line discount; `consumeUsage` for each applied rule (if it returns false, re-run without that rule)
6. `computeLine` per line (tax after discount) → invoice totals; `amountDue = amountTotal`, `amountPaid = 0`
7. Snapshot billing name, email, address; `invoiceDate = periodStart`; `dueDate = invoiceDate + paymentTerm.dueDays`
8. Insert invoice `DRAFT` + lines; `subscription.nextInvoiceDate = periodEnd + 1 day`; `logActivity`
9. Catch the unique-index violation (P2002) as `skipped` (race-safe)

Also `POST /api/subscriptions/:id/invoices` (staff) → generate for the subscription's current `nextInvoiceDate` (manual "Create invoice" button).

If T1 isn't merged yet, use a temporary `addPeriod` in `invoice-generator.ts` marked `// TODO(T1)` and swap it in later.

## Acceptance criteria
- [ ] Generated invoice lines and totals match the subscription and a hand calculation incl. 18% GST and a 10% discount
- [ ] Calling twice for the same period → second is `skipped`; DB has one invoice
- [ ] Paused or closed subscription → not generated
- [ ] Inactive add-on not invoiced
- [ ] Vitest / integration tests for the above
