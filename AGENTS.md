# AGENTS.md

Instructions for any AI coding assistant used on this repo (Claude Code, GitHub Copilot, Cursor, Codex, Gemini, etc.).
Every team member's assistant must follow these rules.

## 1. Authorship rules (non-negotiable)

This is a hiring hackathon (**Odoo x Flux**). Reviewers judge each person on their own git history. All contributions must be credited **only to the human team member** who made them.

- **No AI contributor and no AI co-contributor.** Never add `Co-Authored-By:` trailers that name an AI or tool (Claude, Copilot, Cursor, ChatGPT, Gemini, etc.).
- **Never** add "Generated with …", "🤖", "AI-assisted" or similar lines to commit messages, PR titles, PR descriptions, issue text, code comments, or docs.
- **Never** change `git config user.name` / `user.email`, and never pass `--author`. Commits use the identity of the human whose machine it is.
- **Do not commit, push, open PRs or create issues** unless the human explicitly asks in that moment. The human reviews the diff and commits it themselves.
- Never force-push to `main`, rewrite shared history, or skip hooks (`--no-verify`).

## 2. Project context

Read these before making changes:
- `docs/01-problem-statement.md`: the problem (Subscription Management System for "Brightloop Software")
- `docs/03-domain-model.md`: entities, fields and state machines (the **source of truth** for the schema)
- `docs/04-business-rules.md`: billing, tax, discount and payment logic
- `docs/05-roles-permissions.md`: Admin / Internal / Portal access
- `docs/09-execution-plan.md`: stack, folder layout, API contracts, git workflow
- `docs/10-task-distribution.md`: who owns which module, the dependency map and the handoff contracts. **Don't edit another member's module** unless that person asked you to.
- `docs/tasks/<ID>-*.md`: **the spec for each task / GitHub issue** (`[M2]`, `[SK4]`…). When a human says "work on issue #N" or "task SK4", read `docs/tasks/README.md` and that spec first, and follow its Build list and Acceptance criteria exactly.

## 3. Stack

- **Frontend:** React + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod, Recharts
- **Backend:** Node.js + Express + TypeScript, Prisma ORM, **PostgreSQL (local)**, Zod, bcrypt, JWT in httpOnly cookie, node-cron, Nodemailer → Mailpit (dev)
- **Tests:** Vitest
- **Infra:** `docker-compose.yml` for Postgres + Mailpit

Hard constraints from the hackathon organisers:
- **No Backend-as-a-Service** (Firebase, Supabase, MongoDB Atlas, etc.). Local PostgreSQL only.
- **No static JSON as a data source** in the final app. All data comes from the DB through our APIs.
- **Avoid third-party APIs.** Don't add a new external service or SDK without team agreement.

## 4. Code conventions

- TypeScript `strict`. No `any` unless justified in a comment.
- **Backend module layout:** `server/src/modules/<module>/{<module>.routes.ts, .controller.ts, .service.ts, .schema.ts}`
  - routes → `validate(zodSchema)` → controller (HTTP only) → service (business logic and transactions) → Prisma
  - Business logic never lives in controllers or routes.
- **Frontend layout:** `client/src/features/<module>/` (pages, components, api hooks). Shared UI goes in `client/src/components/ui/`.
- **Validation on both sides:** Zod schemas on the server are the authority. The client shows field-level errors from the API response.
- **Money:** Prisma `Decimal(12,2)`. Never use JS floats for money math; use the helpers in `server/src/lib/money.ts`.
- **Authorization:** always enforced server-side with `requireRole(...)`. Portal queries **must** be scoped by `customerId` from the session.
- **API response shape:**
  - list: `{ data: T[], meta: { page, limit, total } }`
  - single: `{ data: T }`
  - error: `{ error: { code, message, fields?: Record<string,string> } }`
- Lists are **always** server-paginated (`?page=&limit=&sort=&q=`).
- Naming: `camelCase` vars/functions, `PascalCase` components/types, `kebab-case` file names on the client, DB tables in `snake_case` via Prisma `@@map`.
- Keep comments short and only where the *why* isn't obvious.
- **Schema changes** (`server/prisma/schema.prisma`) go in their own small PR, and the team is told.

## 5. Git workflow

- Branch from `main`: `feat/<module>-<short-desc>`, `fix/<module>-<short-desc>`, `chore/...`
- Commit messages: Conventional Commits, e.g. `feat(subscriptions): add pause/resume actions`
- Small, frequent commits. Open a PR to `main` and get at least 1 teammate review. Link the issue (`Closes #12`).
- Pull/rebase from `main` often. Resolve conflicts locally.

## 6. Commands

```bash
docker compose up -d          # postgres on :5433 + mailpit (http://localhost:8025)
cd server && cp .env.example .env && npm i && npx prisma migrate dev && npm run seed && npm run dev
cd client && cp .env.example .env && npm i && npm run dev
npm run typecheck && npm run lint && npm test     # in server/ (client: npm run build && npm run lint)
```

### Where things are (server)
- New endpoints go in your module's existing router file `server/src/modules/<m>/<m>.routes.ts` (already mounted in `src/routes.ts` behind `authenticate`; **don't edit routes.ts**). Add `<m>.schema.ts`, `<m>.controller.ts`, `<m>.service.ts` next to it. Reference implementation: `modules/auth/`.
- Helpers: `lib/http-error.ts` (`notFound`, `conflict`, `unprocessable`…), `middleware/validate.ts` (`validate`, `zId`, `zDate`, `zMoney`, `zName`, `idParams`), `lib/pagination.ts`, `lib/money.ts`, `lib/tax.ts` (`computeLine`, `sumTotals`), `lib/sequence.ts` (`nextNumber`), `lib/activity.ts`, `lib/dates.ts`, `lib/mailer.ts`, `lib/scope.ts` (`customerScope`), `middleware/require-role.ts` (`staff`, `adminOnly`, `portalOnly`).
- Express 5: async handlers can throw; errors reach `middleware/error-handler.ts` automatically.
- Seed data: add your own file in `server/prisma/seed/` and call it from `prisma/seed.ts`.

### Where things are (client)
- Your pages go in `client/src/features/<f>/`; replace the placeholder in `routes.tsx` (already registered in the router; **don't edit `app/router.tsx`**).
- Use `@/components/ui` (DataTable, Pagination, FormField, Modal, StateBadge, StatusBar, useToast…), `@/lib/api` (`api.get/post/patch/delete`, `ApiError`), `@/lib/form` (`applyServerErrors`), `@/lib/format`. See `/app/ui-kit` for every component.
