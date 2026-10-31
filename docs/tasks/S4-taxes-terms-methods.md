---
id: S4
title: Taxes, payment terms and payment methods (API + config pages)
assignee: Sandhya-Parmar09
milestone: P1 Masters & Core
labels: area:config, type:feature, priority:must
depends: M2, M3, M4
---
## Goal
"Taxes are calculated automatically from rules the admin has set." Payment terms drive invoice due dates. Methods are used when recording payments.

## Read first
`docs/04-business-rules.md` §3 and §6

## Build (write: ADMIN; read: ADMIN + INTERNAL)
| Module | Fields | Rules |
|---|---|---|
| `modules/taxes/` | `name, type (PERCENT/FIXED), rate, isActive` | PERCENT rate 0–100; FIXED rate ≥ 0; unique name; deactivate instead of delete if used |
| `modules/payment-terms/` | `name, dueDays` | `dueDays` 0–365; unique name |
| `modules/payment-methods/` | `name, isActive` | unique name; deactivate if used by payments |

Each has `GET` (paginated + `?active=true`), `POST`, `PATCH`, `DELETE` (409 if referenced), and `GET /options` for selects.

**UI**: one "Configuration" section under `/app/config/` with three simple list + modal-form pages (taxes, payment terms, payment methods). Show a tax example preview: "On ₹1,000 → ₹180 tax".

## Acceptance criteria
- [ ] Tax rate 150% for PERCENT → inline error
- [ ] Deleting a tax used by a product → blocked, offer deactivate
- [ ] Inactive items don't appear in `/options`
- [ ] INTERNAL read-only
