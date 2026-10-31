---
id: M9
title: Customers API and UI
assignee: manojk909
milestone: P1 Masters & Core
labels: area:customers, type:feature, priority:must
depends: M3, M4, M7
---
## Goal
Staff manage customers. Subscriptions (SK1) need a customer picker.

## Build
**API** `modules/customers/` (staff only)
- `GET /api/customers?page&limit&q&sort` (search name/email/company)
- `GET /api/customers/:id` includes counts: active subscriptions, open invoices, outstanding amount
- `POST /api/customers`, `PATCH /api/customers/:id` (email format, unique per customer, phone pattern, optional GSTIN pattern)
- `DELETE /api/customers/:id` → 409 if they have subscriptions or invoices
- `POST /api/customers/:id/invite`: creates a PORTAL user for that customer with a reset-password link email (reuses M6 token logic) → customer sets their own password
- `GET /api/customers/options?q=` (lightweight `{id, name, email}` list for pickers, max 20)

**UI** `features/customers/`: list (search, pagination), form (address block), detail tabs "Subscriptions" and "Invoices" (link to those lists filtered by `customerId`), "Invite to portal" button

## Acceptance criteria
- [ ] Invalid email and phone show inline errors
- [ ] Deleting a customer with history is blocked with a clear message
- [ ] Invite email arrives in Mailpit, and the customer can set a password and log in to the portal
- [ ] `/options` returns within 100 ms on the perf dataset
