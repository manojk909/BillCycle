---
id: S6
title: Quotation templates (API + UI)
assignee: Sandhya-Parmar09
milestone: P1 Masters & Core
labels: area:templates, type:feature, priority:must
depends: S3, S5
---
## Goal
Scene C: "they start from a quotation template that already has the right plan and product lines, and stays valid for a set number of days."

## Build
**API** `modules/quotation-templates/` (ADMIN + INTERNAL)
- Fields: `name, validityDays (1–365), planId, notes?, lines: [{ variantId, quantity ≥ 1, description? }]`
- `GET` (paginated, includes plan name + line count), `GET /:id` (lines with variant label and price, plan), `POST`, `PATCH` (replace lines in a transaction), `DELETE`
- `GET /api/quotation-templates/options`
- Validation: plan must be active; variants active; no duplicate variant lines

**UI** `features/templates/`
- List + form: name, validity days, plan picker (shows period and price), lines grid using **S3's `VariantPicker`** with qty, live subtotal estimate (plan price × plan min qty + Σ line price × qty, before tax)
- "Use template" button → navigates to `/app/subscriptions/new?templateId=<id>` (SK3 handles it)

## Acceptance criteria
- [ ] Template with plan + 2 add-on lines saves and reloads correctly
- [ ] Validity 0 or empty lines → inline errors (empty lines allowed only if the plan line alone is intended, so show a warning not an error)
- [ ] "Use template" lands on the new-subscription form prefilled (once SK3 is merged)
