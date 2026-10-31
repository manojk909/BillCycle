# Task Specs

Every GitHub issue has a matching spec file here (`<ID>-<slug>.md`). The spec is the **source of truth** for the task. The issue body is a copy of it.

## If you are an AI assistant helping a team member
1. Read `AGENTS.md` (authorship rules: **no AI co-author or attribution anywhere**).
2. Read the task spec the human points you to, then every doc listed under **Read first** in it.
3. Only create or edit files listed under **Build** (or clearly inside that module's folders). If you need a change in another member's module or in `server/prisma/schema.prisma`, **stop and tell the human**. They will coordinate it.
4. Use the shared helpers from M3/M4 (`validate`, `HttpError`, `paginate`, `money`, `tax`, `api.ts`, the UI kit). Don't build parallel versions.
5. When done, walk through **Acceptance criteria** one by one and say which ones you verified and how.

## Workflow for every task
```bash
git checkout main && git pull
git checkout -b feat/<module>-<short-desc>      # e.g. feat/plans-crud
# ... work, commit small and often (Conventional Commits) ...
git push -u origin feat/<module>-<short-desc>
# open PR → title "[ID] <issue title>", body "Closes #<issue number>", request review
```

## Definition of done (applies to every task)
- [ ] Inputs validated with Zod on the server. Errors return `422 { error: { code: "VALIDATION_ERROR", message, fields } }` and show inline in the form
- [ ] Roles enforced server-side (`requireRole`). Tested by calling the endpoint as the wrong role
- [ ] Lists paginated server-side (`page`, `limit`, `q`, `sort`)
- [ ] UI uses the shared UI kit, has loading, empty and error states, and shows toasts on success/failure
- [ ] Money uses `Decimal` + `lib/money.ts` helpers, never JS floats
- [ ] Pure business logic has Vitest tests
- [ ] `npm run lint` and `npm test` pass in the packages you touched
- [ ] Works on a fresh `prisma migrate reset` + seed
- [ ] PR reviewed by one teammate and merged

## Shared enums (from the Prisma schema, M2)
| Enum | Values |
|---|---|
| `Role` | `ADMIN` `INTERNAL` `PORTAL` |
| `ProductType` | `SERVICE` `GOODS` |
| `BillingPeriod` | `DAILY` `WEEKLY` `MONTHLY` `YEARLY` |
| `TaxType` | `PERCENT` `FIXED` |
| `DiscountType` | `PERCENT` `FIXED` |
| `DiscountScope` | `PRODUCTS` `SUBSCRIPTION` |
| `SubscriptionState` | `DRAFT` `QUOTATION` `CONFIRMED` `ACTIVE` `PAUSED` `CLOSED` |
| `InvoiceState` | `DRAFT` `CONFIRMED` `PAID` `CANCELLED` |

## Index
| ID | Owner | Task |
|---|---|---|
| M1 | Manoj | Scaffold server and client projects |
| M2 | Manoj | Prisma schema, migration, base seed |
| M3 | Manoj | Server core: errors, validation, pagination, sequences, money/tax helpers, router stubs |
| M4 | Manoj | Client shell, auth context, routing, UI kit |
| M5 | Manoj | Auth API: signup, login, logout, me |
| M6 | Manoj | Forgot / reset password + mailer |
| M7 | Manoj | RBAC middleware + users management |
| M8 | Manoj | Auth pages |
| M9 | Manoj | Customers API + UI |
| M10 | Manoj | Payments API + UI |
| M11 | Manoj | Reports API |
| M12 | Manoj | Dashboard UI |
| M13 | Manoj | Customer portal (API + pages) |
| M14 | Manoj | Integration, hardening, demo |
| S1 | Sandhya | Attributes and values |
| S2 | Sandhya | Products and variants API |
| S3 | Sandhya | Products UI |
| S4 | Sandhya | Taxes, payment terms, payment methods |
| S5 | Sandhya | Recurring plans |
| S6 | Sandhya | Quotation templates |
| S7 | Sandhya | Discount rules CRUD |
| S8 | Sandhya | Discount engine |
| SK1 | Shubham | Subscriptions API (CRUD, lines, totals, from template) |
| SK2 | Shubham | Subscription state machine |
| SK3 | Shubham | Subscriptions UI |
| SK4 | Shubham | Invoice generation service |
| SK5 | Shubham | Billing run + scheduler |
| SK6 | Shubham | Invoice actions (confirm, cancel, send, print data) |
| SK7 | Shubham | Invoices UI |
| T1 | Trivedh | Billing period math |
| T2 | Trivedh | Printable invoice view |
| T3 | Trivedh | Email templates |
| T4 | Trivedh | Performance seed + report |
| T5 | Trivedh | Unit tests for money/tax/password helpers |
