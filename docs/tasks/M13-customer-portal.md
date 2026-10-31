---
id: M13
title: "Customer portal: my subscriptions, my invoices, profile (API + pages)"
assignee: manojk909
milestone: P3 Insight & Portal
labels: area:portal, type:feature, priority:must
depends: M7, SK2, SK6, T2
---
## Goal
"Customers see only their own subscriptions and invoices through a portal" and manage them without emailing anyone.

## Read first
`docs/05-roles-permissions.md` (Portal column)

## Build
**API** `modules/portal/` (PORTAL only; every query uses `customerScope(req)`)
- `GET /api/portal/summary` → `{ activeSubscriptions, nextInvoiceDate, amountDue, overdueAmount }`
- `GET /api/portal/subscriptions`, `GET /api/portal/subscriptions/:id` (lines, plan, next invoice date, allowed actions computed from the plan)
- `POST /api/portal/subscriptions/:id/{pause|resume|close|renew}` → **calls SK2's service functions** (`pauseSubscription(id, actor)` etc.) after the ownership check. Don't duplicate the state logic
- `POST /api/portal/subscriptions/:id/lines/:lineId/toggle` → add-on on/off (only non-plan lines, takes effect next period)
- `POST /api/portal/quotations/:id/accept`: the customer accepts their own quotation (calls SK2 `confirmSubscription`)
- `GET /api/portal/invoices`, `GET /api/portal/invoices/:id`, `GET /api/portal/invoices/:id/print-data` (reuses SK6's builder)
- `PATCH /api/portal/profile` (name, phone, address)

**UI** `client/src/features/portal/` inside `PortalLayout` (mobile-friendly)
- Home: summary cards + "Pay attention" list (overdue invoices, quotations awaiting acceptance)
- My subscriptions: cards with status badge, plan, next invoice, total; detail with action buttons shown only if allowed (confirm dialogs)
- My invoices: list with status, amount due; detail + "Download / Print" (T2 view)
- Profile + change password

## Acceptance criteria
- [ ] Customer A requesting customer B's subscription or invoice ID → 404
- [ ] Pause button absent when the plan isn't pausable, and the API also rejects it
- [ ] Customer can accept a quotation and then sees it as Confirmed or Active
- [ ] Works on a phone-width screen
