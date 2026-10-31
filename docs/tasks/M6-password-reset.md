---
id: M6
title: Forgot / reset password with email link and mailer
assignee: manojk909
milestone: P1 Masters & Core
labels: area:auth, area:email, type:feature, priority:must
depends: M5
---
## Goal
"If they forget it later, a reset link should arrive at their registered email."

## Read first
`docs/06-research-notes.md` §6, `docs/tasks/T3-email-templates.md` (template signature)

## Build
- `server/src/lib/mailer.ts`: `sendMail({ to, subject, html, text })` via Nodemailer SMTP (`SMTP_HOST/PORT`, Mailpit in dev). Errors are logged, not thrown to the user. **Other modules (SK6, M13) use this**
- `POST /api/auth/forgot-password { email }` → always `200 { data: { message: "If an account exists, a reset link has been sent." } }`. If the user exists: create 32-byte random token, store **SHA-256 hash** + `expiresAt = now + RESET_TOKEN_TTL_MINUTES`, invalidate older unused tokens, email the link `${CLIENT_URL}/reset-password/<token>`. Rate limit 5/15 min per IP
- `POST /api/auth/reset-password { token, password }` → validate `passwordSchema`, token exists + not used + not expired → update hash, mark used, `200`. Otherwise `400 INVALID_OR_EXPIRED_TOKEN`
- Email body uses T3's `resetPasswordEmail({ name, link })` if merged, otherwise a simple inline template (swap later)

## Acceptance criteria
- [ ] Reset email visible in Mailpit (http://localhost:8025) with a working link
- [ ] Unknown email → same 200 message, no email sent
- [ ] Token reused or after expiry → 400
- [ ] New password must pass the same policy
- [ ] DB contains only token hashes

## Out of scope
UI pages (M8).
