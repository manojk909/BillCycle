# 09: Execution Plan (Odoo x Flux Hackathon)

Team: **Manoj Kharkar** (lead), **Sandhya Parmar**, **Shubham Kang**, **Challa Trivedh Kumar** (travelling)
Task ownership: [10-task-distribution.md](10-task-distribution.md)

## 1. What the judges score, and how we answer it

| Judging point (from coordinator) | How BillCycle answers it |
|---|---|
| **Database design** (most important) | Normalised PostgreSQL schema from [03](03-domain-model.md). FKs, unique constraints (email, invoice per period), check constraints, indexes, Decimal money, enums for states |
| Proper backend + APIs, local DB, no BaaS | Express + Prisma + local Postgres. Our own REST API. Zero BaaS |
| Real-time / dynamic data | Every screen reads the DB through the API. Dashboard computed live with SQL aggregates. Billing run produces real invoices |
| Robust input validation | Zod on the server (authority) + the same rules in client forms. Field-level error messages. Live password checklist |
| Proper use of git | Every member commits their own module from their own machine. Feature branches, PRs, reviews, linked issues |
| Clean, interactive UI | One design system (Tailwind tokens, shared components). Odoo-like list → form, status bar, smart buttons, toasts, empty states |
| Logic and modularity | Module-per-domain backend. Pure, unit-tested business functions (billing period math, tax, discounts) |
| Performance | Server-side pagination, indexes, stored totals, aggregate queries, 10k-row seed to prove < 2 s |
| Security | bcrypt, httpOnly JWT cookie, RBAC middleware, portal row-scoping, hashed single-use reset tokens, rate-limited auth |
| Debugging | Central error handler, request logging, clear error codes |
| Everyone presents | Each member demos the module they built (see §8) |

## 2. Stack (decided)

| Layer | Choice | Why |
|---|---|---|
| DB | **PostgreSQL 16** (Docker) | Organisers want local SQL. Partial unique indexes, `FOR UPDATE`, `FILTER` aggregates |
| ORM | **Prisma** | Typed schema file the whole team can read. Migrations. Decimal support |
| Backend | **Node 20 + Express + TypeScript** | Familiar, fast to build, easy to keep modular |
| Validation | **Zod** | Same schemas usable on the client |
| Auth | bcrypt + JWT in httpOnly cookie | Our own implementation, no auth SaaS |
| Jobs | **node-cron** (+ manual "Run billing" endpoint) | In-process, no extra infra |
| Email | **Nodemailer → Mailpit** (local SMTP catcher) | Demo reset links and invoice emails offline |
| PDF / print | Print-optimised HTML page + browser "Save as PDF" | No third-party PDF API |
| Frontend | **React + Vite + TypeScript + Tailwind** | Fast dev server, consistent styling |
| Data fetching | TanStack Query | Caching and refetch after mutations, so data stays live |
| Forms | React Hook Form + Zod | Field errors with little boilerplate |
| Charts | Recharts | Dashboard |
| Tests | Vitest | Unit tests for pure business logic |

## 3. Repository layout

```
BillCycle/
├─ AGENTS.md  CLAUDE.md  README.md  docker-compose.yml   (server/.env.example, client/.env.example)
├─ docs/
├─ server/
│  ├─ prisma/ schema.prisma · migrations/ · seed.ts · seed-perf.ts
│  └─ src/
│     ├─ app.ts  server.ts
│     ├─ config/            env loading
│     ├─ middleware/        auth.ts · require-role.ts · validate.ts · error-handler.ts · rate-limit.ts
│     ├─ lib/               prisma.ts · mailer.ts · sequence.ts · money.ts · tax.ts · period.ts · pagination.ts
│     ├─ templates/email/   reset-password.ts · invoice-sent.ts · overdue-reminder.ts
│     ├─ jobs/              scheduler.ts · billing-run.ts · lifecycle.ts
│     └─ modules/
│        auth/ users/ customers/ products/ attributes/ plans/ taxes/ payment-terms/
│        payment-methods/ discounts/ quotation-templates/ subscriptions/ invoices/
│        payments/ reports/ portal/
└─ client/
   └─ src/
      ├─ app/               router.tsx · providers.tsx · layouts/ (AppLayout, PortalLayout, AuthLayout)
      ├─ components/ui/     Button Input Select Table Pagination Modal Badge StatusBar KpiCard Toast EmptyState
      ├─ lib/               api.ts (fetch wrapper) · format.ts (money/date) · validators.ts
      └─ features/          auth users customers products plans taxes discounts templates
                            subscriptions invoices payments dashboard portal
```

## 4. API contract (agree on this first so frontend and backend can be built in parallel)

Base `/api`. Auth by cookie. Roles: `A` = Admin, `I` = Internal, `P` = Portal.

| Module | Endpoints | Roles |
|---|---|---|
| auth | `POST /auth/signup` `POST /auth/login` `POST /auth/logout` `GET /auth/me` `POST /auth/forgot-password` `POST /auth/reset-password` | public / any |
| users | `GET /users` `POST /users` (create internal) `PATCH /users/:id` | A |
| customers | `GET/POST /customers` `GET/PATCH/DELETE /customers/:id` | A, I |
| attributes | `GET/POST /attributes` `PATCH/DELETE /attributes/:id` (values nested) | A (I read) |
| products | `GET/POST /products` `GET/PATCH/DELETE /products/:id` `GET/POST /products/:id/variants` | A (I read) |
| plans | `GET/POST /plans` `GET/PATCH/DELETE /plans/:id` `?availableOn=date` | A (I read) |
| taxes / payment-terms / payment-methods | standard CRUD | A (I read) |
| discounts | standard CRUD | **A only** (I read) |
| quotation-templates | standard CRUD | A, I |
| subscriptions | `GET/POST /subscriptions` `GET/PATCH /subscriptions/:id` `POST /subscriptions/from-template` `POST /subscriptions/:id/{send,confirm,activate,pause,resume,renew,close,cancel}` | A, I |
| invoices | `GET /invoices?status=draft\|outstanding\|overdue\|paid` `GET /invoices/:id` `POST /subscriptions/:id/invoices` `POST /invoices/:id/{confirm,cancel,send}` `GET /invoices/:id/print` | A, I |
| billing | `POST /billing/run { upTo }` → `{ created, skipped, failed[] }` `GET /billing/runs` | A, I |
| payments | `GET /payments` `POST /invoices/:id/payments` `DELETE /payments/:id` | A, I (delete A) |
| reports | `GET /reports/summary` `GET /reports/revenue-trend` `GET /reports/overdue` (filters: `from,to,planId,customerId`) | A, I |
| portal | `GET /portal/subscriptions[/:id]` `POST /portal/subscriptions/:id/{pause,resume,close,renew}` `GET /portal/invoices[/:id]` `PATCH /portal/profile` | P |

Shared conventions: see `AGENTS.md` §4 (response envelope, pagination, error format).

## 5. Phases and checkpoints

The hackathon length isn't fixed here. Treat these as **ordered checkpoints**. At each one, everyone merges to `main` and runs the full app.

| Phase | Goal | Exit criteria |
|---|---|---|
| **P0: Foundation** (Manoj, first) | Scaffold, Docker, full Prisma schema + seed, server core, client shell | `docker compose up` + `npm run dev` works for all four. Login as the seeded admin. Empty pages per module exist in the sidebar |
| **P1: Masters and core records** | Auth, catalog, plans, taxes, templates, customers, subscriptions CRUD | Admin creates product + variant + plan + tax. Staff creates a subscription from a template. Status bar works |
| **P2: Money flow** | Invoice generation, billing run, discounts engine, invoice actions, payments | Run billing → invoices with tax + discount. Re-run → 0 new. Confirm → pay → Paid |
| **P3: Insight and portal** | Dashboard/reports, customer portal, scheduler jobs, emails, print | Finance KPIs live. Customer sees only their own data |
| **P4: Hardening and demo** | Perf seed (10k subs), indexes, validation polish, empty/error states, README, demo rehearsal | Every page < 2 s on perf data. Demo script runs clean twice |

**While P0 is in progress**, the others aren't blocked: they read the docs, sketch screens, write their Zod schemas and service logic against the agreed schema in [03](03-domain-model.md), and Trivedh works on pure utilities.

## 6. Git workflow

1. Each member sets their own identity once: `git config user.name "<Full Name>"` and `git config user.email "<email linked to GitHub>"`, so commits show on their profile.
2. `main` is always runnable. Turn on branch protection (PR required, 1 approval) after P0 lands.
3. Branch per issue: `feat/<module>-<desc>`. Conventional Commits. PR title = issue title. Body says `Closes #N`.
4. **Schema file is a hotspot.** Manoj owns `schema.prisma`. Others raise a small PR for schema changes and tell the group.
5. Review buddies: Manoj ↔ Shubham, Sandhya ↔ Manoj, Shubham ↔ Sandhya, Trivedh → Manoj.
6. Commit small and often. A history of steady commits from all four people is part of the score.
7. **No AI attribution anywhere** (see `AGENTS.md` §1).

## 7. Definition of done (per issue)
- [ ] API validates input with Zod and returns field errors
- [ ] RBAC enforced server-side and checked with a wrong-role user
- [ ] List is paginated, filterable and searchable where relevant
- [ ] UI uses shared components, has loading, empty and error states, and toasts on actions
- [ ] Pure logic has Vitest tests
- [ ] Works with seed data. PR reviewed and merged

## 8. Demo split (everyone presents)
| Part | Presenter |
|---|---|
| Intro, architecture, **DB schema walkthrough**, auth + roles, customers, payments, dashboard + performance proof, customer portal | Manoj |
| Catalog (product variants, Odoo +560), plans, taxes, **discount rules + engine**, quotation templates | Sandhya |
| Subscription lifecycle, **billing run + no-double-billing proof**, invoice confirm/send/print | Shubham |
| Billing-period math and unit tests, printable invoice, email templates, 10k-row perf seed | Trivedh |
