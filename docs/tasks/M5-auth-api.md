---
id: M5
title: "Auth API: signup, login, logout, me"
assignee: manojk909
milestone: P1 Masters & Core
labels: area:auth, type:feature, priority:must
depends: M2, M3
---
## Goal
Secure account creation and login matching Scene A of the problem statement.

## Read first
`docs/01-problem-statement.md` Scene A, `docs/02-requirements.md` FR-AUTH-*, `docs/04-business-rules.md` §1, `docs/06-research-notes.md` §6

## Build (`server/src/modules/auth/`, `server/src/middleware/auth.ts`)
- `auth.schema.ts`: `passwordSchema`: length **> 8** (constant `PASSWORD_MIN_LENGTH = 9`), ≥1 uppercase, ≥1 lowercase, ≥1 special (`/[^A-Za-z0-9]/`). One clear message per broken rule. `emailSchema`: trimmed, lowercased, valid format
- `POST /api/auth/signup` `{ name, email, password, companyName?, phone? }` → creates `Customer` + `User(role=PORTAL)` in one transaction → sets cookie, returns `{ data: user }`. Duplicate email → `409 { fields: { email: "An account with this email already exists" } }`
- `POST /api/auth/login` `{ email, password }` → bcrypt compare (cost 12). Same generic error for wrong email or password. Inactive user → 403. Rate limit 10/min per IP
- `POST /api/auth/logout` → clears cookie
- `GET /api/auth/me` → `{ id, name, email, role, customerId }`
- JWT `{ sub, role, customerId }` in an **httpOnly, SameSite=Lax** cookie `bc_session` (Secure in production), expiry from env
- `middleware/auth.ts`: `authenticate` (reads cookie, sets `req.user`, 401 if missing or invalid). Add a `req.user` type in `types/express.d.ts`
- `PATCH /api/auth/me` (name, phone) and `POST /api/auth/change-password { currentPassword, newPassword }`

## Acceptance criteria
- [ ] `Test@1234` (8 chars) rejected; `Test@12345` accepted; `test@12345` rejected (no uppercase); `Test12345a` rejected (no special)
- [ ] `User@X.com` then `user@x.com` → second signup gets 409
- [ ] Password never returned in any response; `passwordHash` never selected outside auth service
- [ ] Cookie is httpOnly. `/me` works after login and returns 401 after logout
- [ ] Vitest: password rule tests; supertest happy path signup → me → logout

## Out of scope
Reset flow (M6), role checks (M7), UI (M8).
