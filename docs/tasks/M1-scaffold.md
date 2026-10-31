---
id: M1
title: Scaffold server and client projects with tooling
assignee: manojk909
milestone: P0 Foundation
labels: area:foundation, type:chore, priority:must
depends:
---
## Goal
A fresh clone runs an empty API and an empty React app with one command each. Everyone else starts from this.

## Read first
`AGENTS.md`, `docs/09-execution-plan.md` §2–3

## Build
**server/** (Node 20, TypeScript `strict`, ESM or CJS, your choice, just be consistent)
- deps: `express cors cookie-parser helmet zod @prisma/client bcrypt jsonwebtoken nodemailer node-cron morgan dotenv`
- dev deps: `typescript tsx prisma vitest supertest eslint prettier @types/*`
- scripts: `dev` (tsx watch src/server.ts), `build`, `start`, `test` (vitest run), `lint`, `format`, `seed` (tsx prisma/seed.ts), `seed:perf`, `db:migrate` (prisma migrate dev), `db:reset`
- `src/config/env.ts`: load `.env`, validate with Zod (`PORT, DATABASE_URL, JWT_SECRET, CLIENT_URL, SMTP_HOST, SMTP_PORT, MAIL_FROM, RESET_TOKEN_TTL_MINUTES, SCHEDULER_ENABLED`). Fail fast with a clear message
- `src/app.ts` exports `createApp()` (helmet, cors `{ origin: CLIENT_URL, credentials: true }`, json, cookie-parser, morgan). `src/server.ts` listens
- `GET /api/health` → `{ data: { status: "ok", db: "up" } }` (runs `SELECT 1`)
- `tsconfig.json` with path alias `@/*` → `src/*`

**client/** (Vite `react-ts`)
- deps: `react-router-dom @tanstack/react-query react-hook-form zod @hookform/resolvers recharts lucide-react clsx`
- Tailwind CSS configured, path alias `@/` → `src/`
- One placeholder page that calls `/api/health` and shows the result (proves the wiring)

**root**
- Shared Prettier config (`.prettierrc`), ESLint config per package
- `.vscode/extensions.json` (eslint, prettier, prisma, tailwind)
- Delete `.gitkeep` from folders that now contain real files
- Update `README.md` "Getting started" and `AGENTS.md` §6 with the real commands

## Acceptance criteria
- [ ] Fresh clone + README steps → `http://localhost:4000/api/health` returns ok with `db: "up"`
- [ ] `http://localhost:5173` renders and shows the health result
- [ ] `npm run lint` and `npm test` (one sample test) pass in both packages
- [ ] Missing or invalid `.env` value → server exits with a readable error

## Out of scope
DB models (M2), middleware and helpers (M3), layout and UI kit (M4).
