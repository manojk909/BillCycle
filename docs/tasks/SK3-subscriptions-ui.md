---
id: SK3
title: "Subscriptions UI: list, form with status bar, lines grid, actions"
assignee: ShubhamKang
milestone: P1 Masters & Core
labels: area:subscriptions, area:ui, type:feature, priority:must
depends: SK1, SK2, M4, S3
---
## Goal
The most-used screen. It should feel like Odoo: status bar on top, action buttons by state, lines grid with live totals.

## Build `client/src/features/subscriptions/`
- **List** `/app/subscriptions`: state tabs with counts (All, Draft, Quotation, Confirmed, Active, Paused, Closed), search (number/customer), filters (plan, customer), sort, pagination; columns number, customer, plan, state badge, next invoice, total. Optional kanban toggle grouped by state
- **New / Edit** `/app/subscriptions/new[?templateId=]`, `/app/subscriptions/:id`:
  - Header: `StatusBar` (Draft → Quotation → Confirmed → Active → Closed; Paused shown when relevant) + action buttons from `allowedActions` (with `ConfirmDialog` for close/cancel, reason input)
  - Fields: customer (M9 picker), plan (S5 options filtered by start date, shows "₹999 / month · min 1"), quantity, start date, expiry date, payment term, quotation valid until (read-only)
  - Lines grid: plan line (locked, top), add-on lines via S3 `VariantPicker`, qty, unit price, taxes multi-select, amount; active toggle per add-on; live untaxed / tax / total (client preview; server is the authority)
  - Smart button "Invoices (n)" → `/app/invoices?subscriptionId=`
  - Activity log panel (chatter style) from `GET /api/subscriptions/:id/activity`
- Read-only form when the state doesn't allow edits

## Acceptance criteria
- [ ] Create from template in < 1 minute (demo step)
- [ ] Server validation errors land on the right field, including line fields (`lines.1.quantity`)
- [ ] Buttons match `allowedActions` exactly; the state badge colour matches the UI kit
- [ ] List stays fast with 10k rows (server pagination)
