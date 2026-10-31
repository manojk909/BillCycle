---
id: M7
title: RBAC middleware, portal scoping and users management (admin creates staff)
assignee: manojk909
milestone: P1 Masters & Core
labels: area:auth, area:users, type:feature, priority:must
depends: M5, M4
---
## Goal
"Only the admin can add a new member of staff." Server-side role enforcement every module uses.

## Read first
`docs/05-roles-permissions.md` (the full matrix)

## Build
- `server/src/middleware/require-role.ts`: `requireRole(...roles: Role[])` → 403 `FORBIDDEN`. Export ready-made guards: `adminOnly`, `staff` (ADMIN + INTERNAL), `portalOnly`
- `server/src/lib/scope.ts`: `customerScope(req)` returns `{ customerId }` for PORTAL users (throws if missing) and `{}` for staff. Portal endpoints must use it. Accessing another customer's record → **404**, not 403
- `modules/users/`: `GET /api/users` (admin, paginated, filter by role), `POST /api/users { name, email, role: INTERNAL|ADMIN, password }` (admin only; password policy applies), `PATCH /api/users/:id { name, role, isActive }` (admin; can't deactivate yourself or the last admin)
- `client/src/features/users/`: Users list (role badge, active toggle) + "New staff member" modal with validation
- Document guard usage at the top of `require-role.ts` with a 3-line example for teammates

## Acceptance criteria
- [ ] INTERNAL calling `POST /api/users` → 403; PORTAL → 403; ADMIN → 201
- [ ] Deactivated user cannot log in
- [ ] Users page hidden from INTERNAL in the sidebar and blocked by route guard
- [ ] Supertest covering the three roles

## Out of scope
Applying guards inside other modules (each owner does that with these helpers).
