---
id: S3
title: Products UI (list, form, variant editor with live price)
assignee: Sandhya-Parmar09
milestone: P1 Masters & Core
labels: area:catalog, area:ui, type:feature, priority:must
depends: S2, M4
---
## Goal
A clean Odoo-like product screen that makes the "+560 for Odoo brand" behaviour obvious in the demo.

## Build `client/src/features/products/`
- List: name, type badge, sales price, variants count, active toggle; search, type filter, pagination
- Form: name, type, sales price, cost price (admin only), default taxes (multi-select), notes. Margin shown as `(sales − cost)/sales %` for admin
- Variants tab: table of variants (values, computed price, SKU), "Add variant" modal picking one value per attribute with **live price preview** ("1200 + 560 = 1760")
- Archive / unarchive with confirm dialog
- `api.ts` with TanStack Query hooks: `useProducts`, `useProduct`, `useSaveProduct`, `useVariantOptions` (exported for SK3 and S6 line pickers)
- `components/VariantPicker.tsx`: searchable select using `/variants/options`, returns `{ variantId, label, price, taxIds }`. **Export it**; SK3 and S6 reuse it

## Acceptance criteria
- [ ] Create product → add Odoo variant → list shows 2 variants and the correct price
- [ ] Validation errors from the API appear on the right fields
- [ ] INTERNAL sees read-only form, no cost price
- [ ] `VariantPicker` works standalone (shown on the `/app/ui-kit` page or a story)
