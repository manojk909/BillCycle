# Today's MVP Scope (deadline 17:00)

**Goal: one end-to-end story that works**, then add extras only if time is left.

> **AI assistants:** if a task appears below, build **only the MVP slice listed here** first, even if the full spec in `docs/tasks/<ID>-*.md` asks for more. Treat the rest of the spec as "later". Issues labelled `later` are not started until the MVP works end to end.

## The story we demo
1. Sign up / log in (password rules, unique email, roles: admin / staff / customer). Admin creates staff
2. Admin: product with variant (Brand: Odoo **+560**), taxes, payment terms, plans
3. Staff: subscription (customer, plan, lines) Draft → Quotation → Confirmed → Active → Closed
4. **Run billing** button → invoices with tax + discount auto-filled; run again → 0 new
5. Confirm / cancel / print invoice
6. Record payment → Paid; Outstanding / Overdue filters
7. Dashboard KPIs: active subs, collected, outstanding, overdue
8. Customer portal: sees only their own subscriptions and invoices

## Timeline
| Time | What |
|---|---|
| 12:30–13:15 | Foundation #1–#4 on `main` (Manoj). Others prepare logic offline |
| 13:15–15:15 | Build MVP slices in parallel. **Merge to `main` at least every hour** |
| 15:15–15:45 | Integration: everyone merged, run the story, fix |
| 15:45–17:00 | Remaining MVP + polish, then `later` items if everything works. No code freeze: keep merging, final push by 17:00 |

## MVP slice per issue
| Issue | MVP slice (build this) | Later |
|---|---|---|
| #1 M1 | Scaffold (done in foundation) | — |
| #2 M2 | Full schema + core and catalog seed | ER diagram |
| #3 M3 | Core helpers + router stubs | sequence concurrency test |
| #4 M4 | Shell, guards, UI kit, auth pages | UI-kit polish |
| #5 M5 | signup / login / logout / me + password rules | change password, rate limit |
| #6 M6 | forgot / reset: token + link logged to server console **and** sent to Mailpit | templates (T3) |
| #7 M7 | `requireRole` guards + Users list + "New staff member" (admin only) | deactivate rules |
| #8 M8 | Login, Signup (live checklist), Forgot, Reset pages | — |
| #9 M9 | Customers list / create / edit + `/customers/options` | invite to portal, detail tabs |
| #10 M10 | Register payment (method, amount, date, note) → PAID; payments list; `paymentStatus` | delete payment |
| #11 M11 | `/reports/summary` (active subs, collected, outstanding, overdue amount + count, simple MRR) | trend, aging, by-plan |
| #12 M12 | KPI cards + overdue table + date-range filter | charts, auto-refresh |
| #13 M13 | Read-only portal: my subscriptions, my invoices (+ print) | pause/close/renew from portal, accept quote |
| #14 M14 | README run steps, demo seed, demo rehearsal | — |
| #15 S1 | Attributes + values with extra price (simple page) | — |
| #16 S2 | Products CRUD + variants + `/products/variants/options` + `variantPrice` | archive, warnings |
| #17 S3 | Product list + form + add variant with price preview + `VariantPicker` | — |
| #18 S4 | Taxes + payment terms CRUD (payment methods: seed only) | methods CRUD |
| #19 S5 | Plans CRUD + `availableOn` + `isPlanAvailable` / `assertPlanAllows` | active subs count |
| #20 S6 | **later** | quotation templates |
| #21 S7 | Discount rules CRUD (admin only): type, value, scope, products, min qty / amount, dates, usage limit | customer restriction, status filters |
| #22 S8 | **Push a stub by 13:30**, then real `applyDiscounts` + `consumeUsage` (5+ tests) | fixed split edge cases, `releaseUsage` tests |
| #23 SK1 | Subscriptions CRUD + plan line + add-on lines + totals + number | from-template (with S6) |
| #24 SK2 | send / confirm / activate / pause / resume / close / cancel | renew |
| #25 SK3 | List with state tabs + form + lines grid + action buttons | activity log, kanban |
| #26 SK4 | `generateInvoiceForPeriod` (idempotent, tax + discount) | — |
| #27 SK5 | `POST /billing/run` + "Run billing" page (catch-up loop, result counts) | cron scheduler, run history, advisory lock |
| #28 SK6 | List with status filter, detail, confirm, cancel, `print-data` | send email, bulk confirm |
| #29 SK7 | List tabs + form + print page + Register payment button (M10 modal) | — |
| #30 T1 | `period.ts` + tests (**needed by 13:30** for SK4) | — |
| #31 T2 | Print view (needed by 14:30) | — |
| #32 T3 | **later** | email templates |
| #33 T4 | **later**. Instead, after T1/T2: **test the running app and file bugs** | perf seed |
| #34 T5 | **later** | extra tests |
