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
> Run commands are added once the scaffold (task M1) lands.

```bash
docker compose up -d                      # PostgreSQL :5432, Mailpit UI http://localhost:8025
cp server/.env.example server/.env
cp client/.env.example client/.env
```

## Docs
Start at [docs/README.md](docs/README.md). Contribution rules are in [AGENTS.md](AGENTS.md) and [docs/09-execution-plan.md](docs/09-execution-plan.md#6-git-workflow).
