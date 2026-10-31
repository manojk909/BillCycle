---
id: M8
title: "Auth pages: login, signup with live password checklist, forgot, reset"
assignee: manojk909
milestone: P1 Masters & Core
labels: area:auth, area:ui, type:feature, priority:must
depends: M4, M5, M6
---
## Goal
The first screens reviewers see. Polished, with excellent validation feedback.

## Build (`client/src/features/auth/`)
- **Login**: email + password, show/hide password, server error banner, "Forgot password?" link, redirect by role (`/app/dashboard` or `/my/subscriptions`)
- **Signup**: name, company (optional), email, password, confirm password. **Live checklist** under the password (✓ more than 8 chars, ✓ uppercase, ✓ lowercase, ✓ special character). Email format error on blur. Duplicate email error from the API shown under the email field
- **Forgot password**: email → neutral success message
- **Reset password** (`/reset-password/:token`): new + confirm with the same checklist. Invalid or expired token → message + link to request a new one
- Client-side Zod schemas mirror the server rules (put shared rules in `client/src/lib/validators.ts`)
- Branded `AuthLayout` (logo/name "BillCycle", short tagline)

## Acceptance criteria
- [ ] Every rule violation is shown inline before submit; the submit button shows a loading state
- [ ] Keyboard-only usable (tab order, Enter submits)
- [ ] Works at phone width
- [ ] Full flow demoable: signup → logout → forgot → Mailpit link → reset → login
