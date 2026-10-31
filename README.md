# BillCycle

Subscription management system: plans, subscriptions, recurring invoices, payments and revenue reporting in one place.
Built for the **Odoo x Flux Hackathon** (problem statement: *Subscription Management System*).

## Team
| Member | Area |
|---|---|
| Manoj Kharkar | Foundation, DB schema, auth & roles, customers, payments, dashboard, customer portal |
| Sandhya Parmar | Catalog, plans, taxes, discounts, quotation templates |
| Shubham Kang | Subscriptions, invoicing, billing run, scheduler |
| Challa Trivedh Kumar | Billing-period engine, invoice print view, email templates, performance seed |

## Tech stack
React + Vite + TypeScript + Tailwind · Node.js + Express + TypeScript · Prisma · PostgreSQL · Mailpit (local SMTP)

## Repository layout
```
server/   Express API (modules per domain), Prisma schema, jobs, email templates
client/   React app (features per domain, shared UI kit)
docs/     Problem analysis, requirements, domain model, business rules, plan
```

## Getting started
Requires Node 20+ and Docker Desktop.

```bash
docker compose up -d                 # PostgreSQL on :5433, Mailpit (emails) UI on http://localhost:8025

cd server
cp .env.example .env
npm install
npx prisma migrate dev               # create tables
npm run seed                         # demo data
npm run dev                          # API on http://localhost:4000/api  (health: /api/health)

cd ../client                         # second terminal
cp .env.example .env
npm install
npm run dev                          # app on http://localhost:5173 (proxies /api to :4000)
```

Fresh database any time: `cd server && npm run db:reset` (drops, migrates, seeds).

| Login | Email | Password |
|---|---|---|
| Admin | admin@billcycle.local | Admin@12345 |
| Staff | staff@billcycle.local | Staff@12345 |
| Customer (portal) | customer1@billcycle.local (also 2, 3) | Customer@123 |

Useful: `npm run typecheck`, `npm run lint`, `npm test` (server and client), `npm run db:studio` (browse the DB).

## Docs
Start at [docs/README.md](docs/README.md). Contribution rules are in [AGENTS.md](AGENTS.md) and [docs/09-execution-plan.md](docs/09-execution-plan.md#6-git-workflow).
