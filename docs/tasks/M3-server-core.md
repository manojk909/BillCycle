---
id: M3
title: "Server core: errors, validation, pagination, sequences, money/tax helpers, module router stubs"
assignee: manojk909
milestone: P0 Foundation
labels: area:foundation, type:feature, priority:must
depends: M1
---
## Goal
Shared backend building blocks plus pre-registered routers for every module, so owners only fill in their own folder and never fight over `routes.ts`.

## Read first
`AGENTS.md` §4, `docs/09-execution-plan.md` §3–4, `docs/04-business-rules.md` §2–3

## Build (all in `server/src/`)
| File | Exports / behaviour |
|---|---|
| `lib/prisma.ts` | singleton `prisma` |
| `lib/http-error.ts` | `class HttpError(status, code, message, fields?)` + helpers `badRequest`, `notFound`, `forbidden`, `unauthorized`, `conflict`, `unprocessable` |
| `lib/async-handler.ts` | `asyncHandler(fn)` wraps async controllers |
| `middleware/validate.ts` | `validate({ body?, query?, params? })` with Zod schemas. Replaces `req.body/query/params` with parsed values. On failure → `422 VALIDATION_ERROR` with `fields: { "lines.0.quantity": "Must be at least 1" }` |
| `middleware/error-handler.ts` | maps `HttpError`, Zod errors, Prisma `P2002` (unique → 409 with the field name), `P2025` (→ 404); hides stack traces in production; logs unexpected errors |
| `middleware/not-found.ts` | 404 JSON for unknown `/api/*` |
| `middleware/rate-limit.ts` | small in-memory limiter `rateLimit({ windowMs, max })` (no external package needed) |
| `lib/pagination.ts` | `paginationSchema` (Zod: `page` ≥1 default 1, `limit` 1–100 default 20, `q?`, `sort?` like `-createdAt`), `toPrismaArgs(p, allowedSortFields)`, `paginated(data, total, p)` → `{ data, meta: { page, limit, total } }` |
| `lib/money.ts` | `D(x)` → `Prisma.Decimal`, `round2`, `sum(list)`, `min`, `max`, `isZero`, `toFixed2` (string for JSON) |
| `lib/tax.ts` | `computeLine({ quantity, unitPrice, discountAmount, taxes: {id,name,type,rate}[] })` → `{ untaxed, tax, total, breakdown: {taxId,name,amount}[] }`. Rule: untaxed = round2(qty×price − discount); PERCENT tax = round2(untaxed×rate/100); FIXED tax = round2(rate×qty) · `sumTotals(lines)` |
| `lib/sequence.ts` | `nextNumber(tx, 'SUB' \| 'INV', date)` → `SUB/2026/00001`. Upserts the `Sequence` row with `UPDATE … RETURNING` inside the given transaction (safe under concurrency) |
| `lib/activity.ts` | `logActivity(tx, { entityType, entityId, action, message, userId })` |
| `lib/dates.ts` | `today()` (UTC date-only), `addDays`, `toDateOnly`, `daysBetween` |
| `modules/<m>/<m>.routes.ts` | **For every module folder**, export an empty `Router` (`export const productsRouter = Router()`), plus empty `controller/service/schema` files with a TODO naming the owner and task ID |
| `routes.ts` | mounts all module routers under `/api/<m>` (kebab-case paths as in docs/09 §4). Mounted once, so owners never edit it |

Vitest tests: `money.test.ts`, `tax.test.ts`, `pagination.test.ts`, `sequence` (integration test against the DB, optional).

## Acceptance criteria
- [ ] Unknown route → `404 { error: { code: "NOT_FOUND" } }`
- [ ] A sample route using `validate` returns 422 with field errors
- [ ] Unique violation returns 409 with the offending field
- [ ] `computeLine` tests pass for: no tax, 18%, two taxes, fixed tax, discount, rounding (e.g. 3 × 33.335)
- [ ] Two concurrent `nextNumber` calls never return the same number
- [ ] Every module from docs/09 §4 has a mounted (empty) router

## Out of scope
Auth middleware (M5/M7).
