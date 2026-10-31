---
id: SK1
title: "Subscriptions API: CRUD, lines, totals, numbering, create from template"
assignee: ShubhamKang
milestone: P1 Masters & Core
labels: area:subscriptions, type:feature, priority:must
depends: M2, M3
---
## Goal
Scene C: "Each subscription gets its own number, a customer, a plan, a start date, an expiry date and payment terms, with lines showing the product, quantity, unit price, taxes and amount."

## Read first
`docs/01-problem-statement.md` Scene C, `docs/03-domain-model.md` (Subscription, SubscriptionLine), `docs/04-business-rules.md` §2–3, `docs/07-assumptions-open-questions.md` A3–A4, `docs/tasks/README.md`

## Build `server/src/modules/subscriptions/` (staff: ADMIN + INTERNAL)
- `GET /api/subscriptions?page&limit&q&state&planId&customerId&sort` (q matches number or customer name; include customer name, plan name, `amountTotal`, `nextInvoiceDate`). Use `select`, no N+1
- `GET /api/subscriptions/:id` → full record: customer, plan, payment term, lines (with taxes), invoice count, `allowedActions` (computed by SK2)
- `POST /api/subscriptions { customerId, planId, quantity, startDate, expiryDate?, paymentTermId, lines: [{ variantId, quantity, unitPrice?, taxIds?, description? }] }`
  - Creates the **plan line** automatically: `isPlanLine=true`, description "Plan: <name>", unitPrice = plan.price, qty = `quantity`, taxes = plan taxes
  - Add-on lines: `unitPrice` defaults to the variant price (S2 `variantPrice`), `taxIds` default to the product's taxes
  - Validations: plan available on `startDate` (S5 `isPlanAvailable`); `quantity ≥ plan.minQuantity`; `expiryDate > startDate`; customer exists; variants active
  - Computes and stores line + header totals via M3 `computeLine` / `sumTotals`
  - Number assigned on create with `nextNumber(tx, 'SUB', startDate)`, state `DRAFT`
- `POST /api/subscriptions/from-template { templateId, customerId, startDate, paymentTermId }` → copies plan + lines, sets `quotationValidUntil = today + template.validityDays`
- `PATCH /api/subscriptions/:id`: only in `DRAFT` / `QUOTATION` (full edit). In `ACTIVE`: only toggling add-on lines `isActive` and adding add-on lines (effective next period). Recompute totals
- `DELETE /api/subscriptions/:id`: only `DRAFT`
- Put totals recomputation in `subscriptions.totals.ts` (`recomputeSubscription(tx, id)`), which SK4 and M13 reuse

## Acceptance criteria
- [ ] Creating with qty below the plan minimum → `422 { fields: { quantity: "Minimum quantity for this plan is 5" } }`
- [ ] Plan not available on start date → 422 on `planId`
- [ ] Totals equal Σ lines and match a hand calculation (Vitest on the totals function)
- [ ] From-template copies lines and sets quotation validity
- [ ] List endpoint < 200 ms with 10k subscriptions (index on state/customer)
