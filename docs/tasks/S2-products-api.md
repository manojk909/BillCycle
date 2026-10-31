---
id: S2
title: Products and variants API (computed variant price)
assignee: Sandhya-Parmar09
milestone: P1 Masters & Core
labels: area:catalog, type:feature, priority:must
depends: S1
---
## Goal
Scene B: "The admin adds it with its name, type, sales price, cost price and notes, and offers it in variants."

## Read first
`docs/03-domain-model.md` (Product, ProductVariant), `docs/04-business-rules.md` §2

## Build `server/src/modules/products/` (write: ADMIN; read: ADMIN + INTERNAL; `costPrice` is **hidden from non-admins**)
- `GET /api/products?page&limit&q&type&isActive`
- `GET /api/products/:id` → product + taxes + variants (each with `values` and computed `price`)
- `POST /api/products { name, type, salesPrice, costPrice, notes?, taxIds[] }` → also creates a **default variant** (no values)
- `PATCH /api/products/:id`, `POST /api/products/:id/archive` / `unarchive` (no hard delete if referenced)
- `POST /api/products/:id/variants { valueIds[], sku? }`: max one value per attribute; no duplicate combination for the product
- `DELETE /api/products/:id/variants/:variantId` → 409 if used on a subscription, template or invoice line
- `GET /api/products/variants/options?q=` → `[{ variantId, label: "Brightloop CRM (Brand: Odoo)", price, productId, taxIds }]` for line pickers (**SK1, S6 use this**). Only active products
- Export `variantPrice(product, values)` and `variantLabel(...)` from `products.service.ts` (SK1/SK4 import them). Price = `salesPrice + Σ extraPrice`
- Validation: prices ≥ 0, 2 decimals; `costPrice` may exceed `salesPrice` but return a `warning` field

## Acceptance criteria
- [ ] Product 1200 + variant Brand=Odoo → variant price 1760
- [ ] Two values of the same attribute in one variant → 422
- [ ] Duplicate variant combination → 409
- [ ] INTERNAL response has no `costPrice`
- [ ] Vitest for `variantPrice`
