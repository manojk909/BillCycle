# 10: Task Distribution

Ownership is by **vertical module**: each person builds both the backend and the frontend of their module. That keeps merge conflicts low and gives everyone a full-stack story to present.

| Member | GitHub | Owns | Load |
|---|---|---|---|
| **Manoj Kharkar** | *(repo owner)* | Foundation, DB schema, auth and roles, app shell and shared UI, payments, dashboard/reports, integration | Heavy, mostly front-loaded |
| **Sandhya Parmar** | `Sandhya-Parmar09` | Catalog (products, variants), plans, taxes/terms/methods, discounts (CRUD + engine), quotation templates, customers, customer portal | Heavy |
| **Shubham Kang** | `ShubhamKang` | Subscriptions (lifecycle), invoicing, billing run + scheduler | Heavy, the core logic |
| **Challa Trivedh Kumar** | `trivedhchalla` | **Small, independent, offline-friendly**: billing-period math, invoice print view, email templates, perf seed | Light, no one is blocked on him |

## Issue list

Copy these into GitHub issues. Labels: `area:<module>`, `type:feature|chore|test`, `phase:P0..P4`, `priority:must|should|could`.

### Manoj Kharkar
| ID | Title | Phase | Depends on |
|---|---|---|---|
| M1 | Scaffold monorepo: `server/` (Express+TS+Prisma), `client/` (Vite+React+TS+Tailwind), `docker-compose.yml` (Postgres, Mailpit), ESLint/Prettier, `.env.example`, README run steps | P0 | — |
| M2 | Prisma schema for all entities in `docs/03` (enums, FKs, unique and partial indexes, Decimal money) + initial migration + base seed (admin, taxes, payment terms and methods, sample customers/products/plans) | P0 | M1 |
| M3 | Server core: error handler, `validate()` middleware, pagination helper, response envelope, `sequence.ts` (SUB/INV numbering), request logging | P0 | M1 |
| M4 | Client shell: router, providers, `api.ts` wrapper, auth context, AppLayout (role-aware sidebar), PortalLayout, shared UI kit (Button, Input, Select, Table, Pagination, Modal, Badge, StatusBar, KpiCard, Toast, EmptyState) | P0 | M1 |
| M5 | Auth API: signup (portal role + customer record), login/logout/me, unique email (case-insensitive), password policy, bcrypt, JWT httpOnly cookie, login rate limit | P1 | M2, M3 |
| M6 | Forgot/reset password: hashed single-use token (30 min), mailer → Mailpit, same response whether or not the email exists | P1 | M5 |
| M7 | RBAC: `requireRole()` middleware, portal scoping helper, Users API + Users page (admin creates internal user) | P1 | M5 |
| M8 | Auth pages: Login, Signup (live password checklist, inline email errors), Forgot, Reset | P1 | M4, M5 |
| M9 | Payments: `POST /invoices/:id/payments` (no overpay, recompute amount_paid/due, set PAID), delete payment (admin), payments list, "Register payment" dialog on the invoice | P2 | SK6 |
| M10 | Reports API: summary (active subs, MRR, collected, outstanding, overdue), revenue trend, overdue aging, all as SQL aggregates with filters | P3 | M9 |
| M11 | Dashboard UI: KPI cards, revenue chart, overdue table, filter bar (date range, plan, customer), drill-down links | P3 | M10 |
| M12 | Integration and hardening: branch protection, review PRs, run the end-to-end demo script, fix integration bugs, final README | P4 | all |

### Sandhya Parmar
| ID | Title | Phase | Depends on |
|---|---|---|---|
| S1 | Attributes + values (extra price) API and config UI | P1 | M2, M3 |
| S2 | Products API (name, type, sales/cost price, notes, default taxes, archive) + variants (computed price = base + Σ extras) | P1 | S1 |
| S3 | Products UI: list (search, pagination), form with variant editor showing computed price | P1 | S2, M4 |
| S4 | Taxes, payment terms, payment methods: CRUD API + config pages | P1 | M2 |
| S5 | Recurring plans API + UI: period, price, min qty, availability dates, auto-close/closable/pausable/renewable, `?availableOn=` filter | P1 | M2 |
| S6 | Customers API + UI (list, form, linked subscriptions/invoices tabs) | P1 | M2 |
| S7 | Quotation templates API + UI (validity days, plan, lines) | P1 | S2, S5 |
| S8 | Discount rules API + UI (**admin only**): fixed/percent, min amount/qty, dates, usage limit, scope products/subscription, optional customer restriction | P2 | S2 |
| S9 | **Discount engine** `server/src/modules/discounts/discount-engine.ts`: `applyDiscounts(lines, rules, ctx)` (eligibility, best-rule choice, fixed split across lines) + `consumeUsage()` (atomic) + `releaseUsage()`. Vitest tests | P2 | S8 |
| S10 | Customer portal: `/api/portal/*` (scoped by session customer) + pages: My Subscriptions (with allowed actions), My Invoices, Profile/Change password | P3 | SK2, SK6, M7 |

### Shubham Kang
| ID | Title | Phase | Depends on |
|---|---|---|---|
| SK1 | Subscriptions API: CRUD with lines, line/subscription totals (uses `lib/tax.ts`, `lib/money.ts`), numbering, min-qty and plan-availability validation, create-from-template (copies lines, sets quotation expiry) | P1 | M2, M3 |
| SK2 | Subscription state machine: send, confirm, activate, pause, resume, renew, close, cancel, with plan-option guards and close reason | P1 | SK1 |
| SK3 | Subscriptions UI: list (state tabs, search, group-by plan, pagination), form with StatusBar, lines grid (variant picker, live totals), action buttons per state, smart button "Invoices (n)" | P1 | SK1, M4 |
| SK4 | Invoice generation service: from subscription + period → Draft invoice (customer snapshot, lines, taxes, discounts via S9, totals, due date from payment term). Idempotent on `(subscription_id, period_start)` | P2 | SK2, T1 |
| SK5 | Billing run: `POST /billing/run` (row lock, per-subscription transaction, catch-up loop, run report) + node-cron daily jobs (activate, bill, auto-close, expire quotations) + "Run billing" page | P2 | SK4 |
| SK6 | Invoice actions: confirm (assign number, lock), cancel (blocked if paid, release discount usage), send (email via T3 template), print endpoint feeding T2 view | P2 | SK4 |
| SK7 | Invoices UI: list with tabs (Draft/Outstanding/Overdue/Paid), form view with actions, link back to subscription | P2 | SK6 |

### Challa Trivedh Kumar (travelling: small, independent, works offline)
These need **no running DB and no other person's code**. Each has a fixed interface, so others can plug it in. Nothing on the critical path waits on these. If one isn't merged by its checkpoint, the consumer uses a simple stub and swaps it in later.

| ID | Title | Phase | Interface / notes |
|---|---|---|---|
| T1 | **Billing period math** `server/src/lib/period.ts` + Vitest tests | P1 | `addPeriod(date, period: 'DAILY'\|'WEEKLY'\|'MONTHLY'\|'YEARLY', interval=1, anchorDay?)`, `periodEnd(start, period, interval)`, `periodsBetween(from, to, ...)`. Month-end clamping (Jan 31 → Feb 28/29 → Mar 31), leap years. ≥15 test cases. Used by SK4/SK5 |
| T2 | **Printable invoice view** `client/src/features/invoices/invoice-print.tsx` + print CSS | P2 | Takes an `InvoicePrintData` prop (shape below). Company header, bill-to, lines table, discount, tax breakdown, totals, amount paid/due, status stamp. A4, looks clean in "Save as PDF". Build with a local mock object; Shubham wires it to the API |
| T3 | **Email templates** `server/src/templates/email/*.ts` | P2 | Pure functions returning `{ subject, html, text }`: `resetPasswordEmail({name, link})`, `invoiceSentEmail({customerName, invoiceNo, total, dueDate, link})`, `overdueReminderEmail({...daysOverdue})`. Inline CSS, matches app colours |
| T4 | **Perf seed** `server/prisma/seed-perf.ts` | P3 | Generates about 2k customers, 10k subscriptions, about 60k invoices + payments with realistic state spread, in batched `createMany`. Then record timings of the main pages/APIs in `docs/perf-report.md` |
| T5 *(stretch)* | Unit tests for `lib/money.ts` / `lib/tax.ts` and the password validator | P4 | Edge cases: rounding, fixed vs percent tax, multiple taxes |

`InvoicePrintData` (agreed shape for T2):
```ts
{
  company: { name: string; address: string; email: string; taxId?: string };
  invoice: { number: string | null; state: 'DRAFT'|'CONFIRMED'|'PAID'|'CANCELLED';
             invoiceDate: string; dueDate: string; periodStart: string; periodEnd: string;
             subscriptionNumber: string; paymentTerm: string };
  customer: { name: string; email: string; address: string };
  lines: { description: string; quantity: number; unitPrice: string; discount: string;
           taxes: string[]; amount: string }[];
  totals: { untaxed: string; discount: string; tax: string; total: string; paid: string; due: string };
  taxBreakdown: { name: string; amount: string }[];
  currency: string;
}
```

## Dependency map (critical path)

```
M1 ─┬─ M2 ─┬─ M5 ─ M6 / M7 / M8 ───────────────────────────── S10 (portal)
    ├─ M3 ─┤
    └─ M4 ─┴─ S1→S2→S3, S4, S5, S6 → S7 → S8 → S9 ─┐
               SK1 → SK2 → SK3                    ├─ SK4 → SK5, SK6 → SK7 → M9 → M10 → M11
               T1 (pure, any time before SK4) ────┘
               T2, T3 (plug into SK6 any time) · T4 after M2
```

**Critical path:** M1 → M2 → SK1 → SK2 → SK4 → SK5/SK6 → M9 → M10/M11.
Manoj should land **M1 to M3 first**, before anything else, then help unblock Shubham.

## Handoff contracts (who needs what from whom)
| Producer → Consumer | What | Needed by |
|---|---|---|
| Manoj → all | schema, server core, UI kit, `requireRole` | start of P1 |
| Sandhya → Shubham | `applyDiscounts()` / `consumeUsage()` / `releaseUsage()` signatures (stub first, then real) | SK4 |
| Sandhya → Shubham | plans `?availableOn`, variant price | SK1 |
| Trivedh → Shubham | `lib/period.ts` | SK4 (fallback: simple `date-fns` add) |
| Trivedh → Shubham | print view + email templates | SK6 |
| Shubham → Manoj | invoice `amount_due` + state transitions | M9 |
| Shubham → Sandhya | subscription/invoice services reusable with a `customerId` filter | S10 |
