# 08: Architecture and Build Plan

> **Stack decided:** Option B (React + Express + PostgreSQL + Prisma). See [09-execution-plan.md](09-execution-plan.md). The options table below is kept for reference.

## Stack options
| Option | Pros | Cons |
|--------|------|------|
| **A. Odoo custom module** (Python + XML views + OWL) | Free list/form/kanban views, status bars, ORM, portal, PDF reports, cron, mail. Matches the organizers' platform. | Rebuilding `sale_subscription` (Enterprise) features can look like reusing Odoo. The learning curve is steep if the team is new to Odoo. Check whether depending on Odoo Community modules is allowed. |
| **B. Node/TypeScript** (Next.js or Express + React) + **PostgreSQL** + Prisma/Drizzle | Familiar to most teams. Full control. Easy to show custom UI. | Must build auth, RBAC, PDF and cron ourselves. |
| **C. Python** (Django + Django templates/HTMX or React) + **PostgreSQL** | Django admin, auth, ORM, migrations and permissions built in. Fast CRUD. | UI polish takes effort. |

Whatever the stack: **PostgreSQL** (relational integrity, unique partial indexes, `FOR UPDATE`, `FILTER` aggregates). Avoid hosted BaaS for core data unless the rules allow it. Hackathon judges often favor a self-built backend.

## Logical architecture
```
[Browser: Back office /app]   [Browser: Portal /my]
            │                         │
            ▼                         ▼
      ┌──────────── API / Server (RBAC middleware) ────────────┐
      │ Auth │ Catalog │ Plans │ Subscriptions │ Invoicing     │
      │ Discounts │ Taxes │ Payments │ Reports │ Notifications │
      └───────┬──────────────────────────────┬─────────────────┘
              │                              │
         PostgreSQL                  Scheduler / Job worker
                                     (daily: activate, bill, auto-close,
                                      expire quotes; on-demand billing run)
              │
         Mail (SMTP / Mailpit)     PDF renderer (invoice print)
```

## Screens
**Public:** Login · Sign up (live password checklist) · Forgot password · Reset password

**Back office (Admin / Internal)**
1. **Dashboard:** KPI cards (Active subs, MRR, Revenue collected this month, Outstanding, Overdue), revenue trend chart, overdue invoices table, filters (date range, plan, customer)
2. **Subscriptions:** list (search, filter by state, group by plan) and kanban by state → form with status bar, header buttons (Send, Confirm, Pause, Resume, Renew, Close), lines grid, smart button "Invoices (n)", activity log
3. **Quotation templates:** list → form
4. **Invoices:** list with tabs All / Draft / Outstanding / Overdue / Paid → form (Confirm, Cancel, Send, Print, Register payment)
5. **Payments:** list, register-payment dialog (method, amount, date, note)
6. **Customers:** list → form (subscriptions, invoices, balance)
7. **Billing run:** "Run billing up to date X" → result summary (created / skipped / failed)
8. **Configuration (Admin):** Products & variants, Attributes, Recurring plans, Taxes, Discount rules, Payment terms, Payment methods, Users (create internal user), Company settings

**Portal (Customer)**
- My subscriptions (status, next invoice date, plan, lines) with Pause / Close / Renew / toggle add-ons when the plan allows
- My invoices (status, amount due, download PDF)
- My profile / change password

## Build order (hackathon-friendly)
| Phase | Deliverable | Covers |
|-------|-------------|--------|
| 0 | Repo, DB, migrations, seed admin, layout shell | — |
| 1 | Auth: signup/login/logout, password rules, reset via email, roles, admin creates staff, route guards | Scene A |
| 2 | Catalog: products, attributes/values/extra price, variants, taxes, payment terms and methods | Scene B, D (tax) |
| 3 | Plans with options and availability | Scene B |
| 4 | Quotation templates → subscriptions (lines, totals, numbering, state machine) | Scene C |
| 5 | Invoicing: generate from subscription, batch billing run (idempotent), confirm/cancel/send/print PDF | Scene D |
| 6 | Discounts: rules and auto-apply in invoice generation, usage limits | Scene E |
| 7 | Payments: register, partial/paid, outstanding/overdue filters | Scene F |
| 8 | Dashboard and reports with filters | Scene G |
| 9 | Portal pages for customers | Scene A, C, D |
| 10 | Scheduler jobs (activate, bill, auto-close, expire quotes) | Scene B, D |
| 11 | Perf seed (10k subs) + index tuning + timing proof | NFR-01 |
| 12 | Demo script: walk "A Month at Brightloop" end to end | — |

**Must-haves to protect if time runs short:** phases 1, 2, 3, 4, 5, 7, 8. Discounts (6) are explicitly in the PDF, so keep at least the auto-apply path working.

## Demo script (maps to the PDF scenes)
1. Sign up as a new customer → show password validation and duplicate email rejection → forgot password email in Mailpit.
2. As admin: create internal user "Priya (Sales)". Log in as Priya → admin menus hidden.
3. Admin: create product "Brightloop CRM", attribute Brand with Odoo +560 → variant price shown. Create plan "Monthly" (auto-close off, pausable on) and "Yearly".
4. Priya: new subscription from template "CRM Starter" → Draft → Quotation (validity shown) → Confirmed → Active.
5. Admin: discount rule "10% off for ≥ 10 seats" → run billing → invoice shows discount and tax automatically. Run billing again → **0 new invoices** (no double billing).
6. Confirm, send and print the invoice. Record a partial then full payment → Paid.
7. Customer portal: sees only their own subscription and invoice. Tries another ID → 404.
8. Dashboard: active subs, MRR, collected, outstanding, overdue with filters. Switch to the 10k-row perf dataset → pages load in under 2 s.
