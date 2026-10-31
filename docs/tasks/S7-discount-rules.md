---
id: S7
title: Discount rules CRUD (admin only)
assignee: Sandhya-Parmar09
milestone: P2 Money Flow
labels: area:discounts, type:feature, priority:must
depends: S2, M9
---
## Goal
Scene E: "Only the admin can create discount rules: a fixed amount or a percentage, with a minimum purchase or quantity, start and end dates, and a limit on how many times it can be used. A discount can apply to specific products or to whole subscriptions."

## Read first
`docs/04-business-rules.md` §5, `docs/07-assumptions-open-questions.md` A11–A12

## Build
**API** `modules/discounts/` (write: **ADMIN only**; read: staff)
- Fields: `name, code?, type, value, scope, productIds[] (required if scope=PRODUCTS), customerIds[] (optional; empty = everyone), minPurchaseAmount?, minQuantity?, startDate, endDate, usageLimit?, isActive`; read-only `timesUsed`
- `GET` (paginated; filters `status=active|scheduled|expired|exhausted`), `GET /:id` (+ last 20 usages with invoice numbers), `POST`, `PATCH`, `POST /:id/deactivate`
- Validation: PERCENT value 0–100; FIXED > 0; `endDate ≥ startDate`; `usageLimit ≥ timesUsed`; scope PRODUCTS needs ≥1 product
- Status computed: `scheduled` (start > today), `active`, `expired` (end < today), `exhausted` (timesUsed ≥ usageLimit)

**UI** `features/discounts/`
- List with status badges and a "used 3 / 10" progress bar
- Form: type toggle (₹ / %), value, scope (products picker or whole subscription), conditions (min amount, min qty), validity dates, usage limit, customer restriction (M9 customer picker)
- Plain-language summary under the form: "10% off subscriptions with at least 10 seats, valid 1–31 Nov, max 50 uses"

## Acceptance criteria
- [ ] INTERNAL sees the list but gets 403 on create; UI hides the buttons
- [ ] Scope PRODUCTS with no product → inline error
- [ ] Status badge correct for each of the 4 states
