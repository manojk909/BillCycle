# 05: Roles and Permissions

Three roles, from Scene A:

| Role | Who | Created by |
|------|-----|-----------|
| **Admin** | Owner / system administrator | Seeded at install. Admins can create more admins (assumption). |
| **Internal user** | Sales and billing team | **Admin only** |
| **Portal user** | Customer | **Self-signup**, or an admin/internal user invites them when creating a customer |

Legend: **C**reate **R**ead **U**pdate **D**elete/archive, **own** = only records linked to their own customer, `-` = no access.

| Resource / action | Admin | Internal | Portal |
|-------------------|:-----:|:--------:|:------:|
| Users: create Internal | ✅ | - | - |
| Users: manage all | CRUD | R (self) | R/U self |
| Customers | CRUD | CRU | R/U own profile |
| Products, variants, attributes | CRUD | R | R (catalog) |
| Recurring plans | CRUD | R | R (available plans) |
| **Taxes** | CRUD | R | - |
| **Discount rules** | **CRUD (admin only)** | R | - |
| Payment terms and methods | CRUD | R | - |
| Quotation templates | CRUD | CRU *(assumed: sales reps make their own)* | - |
| Subscriptions | CRUD + all transitions | CRU + transitions (send, confirm, pause, close, renew) | R own; pause/close/renew/toggle add-ons own *if plan allows*; accept quotation |
| Invoices | CRUD + confirm/cancel/send/print | CRU + confirm/send/print; cancel *(assumed allowed)* | R own, download PDF |
| Payments | CRUD | CR (record payments); delete *(assumed admin only)* | R own; pay online (could-have) |
| Billing run (manual trigger) | ✅ | ✅ | - |
| Reports / dashboard | ✅ full | ✅ *(assumed; "limited access" may exclude margins/cost price)* | Own summary only (total due, next invoice) |
| Settings (company, sequences, email) | ✅ | - | - |

## Enforcement rules
1. **Check on the server, every request.** Hiding a button in the UI is not access control.
2. **Portal row scoping:** every portal query filters by `customer_id = current_user.customer_id`. Use a shared query helper or policy layer so this can't be forgotten.
3. Return **404** (not 403) for a portal user accessing another customer's record, so it doesn't confirm the record exists.
4. Cost price and margin fields are hidden from Portal (and optionally from Internal).
5. Role changes and staff creation are logged in the audit log.

## Routing split (suggested)
- `/app/*`: back office (Admin + Internal). The menu hides admin-only items for Internal users.
- `/portal/*` (or `/my/*`, like Odoo): customer portal, which shows My Subscriptions, My Invoices and My Profile.
- `/login`, `/signup`, `/forgot-password`, `/reset-password/:token`: public.
