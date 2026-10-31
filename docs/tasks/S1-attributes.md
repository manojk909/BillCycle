---
id: S1
title: Product attributes and values with extra price (API + UI)
assignee: Sandhya-Parmar09
milestone: P1 Masters & Core
labels: area:catalog, type:feature, priority:must
depends: M2, M3, M4
---
## Goal
Scene B: "offers it in variants, for example by brand, where choosing the Odoo brand adds 560 to the price." Attributes and values are the building blocks of variants.

## Read first
`docs/01-problem-statement.md` Scene B, `docs/03-domain-model.md` (Attribute / AttributeValue / ProductVariant), `docs/tasks/README.md`

## Build
**API** `server/src/modules/attributes/` (write: ADMIN; read: ADMIN + INTERNAL)
- `GET /api/attributes?page&limit&q` with values included
- `POST /api/attributes { name, values: [{ name, extraPrice }] }`
- `PATCH /api/attributes/:id`: rename, add/update/remove values in one request (nested upsert in a transaction)
- `DELETE /api/attributes/:id` and value removal → 409 if any variant uses the value
- Validation: names trimmed, non-empty, ≤ 60 chars, unique; `extraPrice` ≥ 0, max 2 decimals

**UI** `client/src/features/products/` (attributes live under the Products menu; add a route like `/app/config/attributes`)
- List: attribute name, values shown as chips "Odoo (+₹560)"
- Form: attribute name + editable values grid (name, extra price, remove row, add row)

## Acceptance criteria
- [ ] Create "Brand" with Odoo +560 and Generic +0, visible in the list
- [ ] Duplicate value name within an attribute → inline error
- [ ] Deleting a value used by a variant → blocked with a message
- [ ] INTERNAL user can view but sees no edit or delete buttons, and the API rejects writes
