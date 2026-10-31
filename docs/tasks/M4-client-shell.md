---
id: M4
title: Client shell, routing, auth context and shared UI kit
assignee: manojk909
milestone: P0 Foundation
labels: area:foundation, area:ui, type:feature, priority:must
depends: M1
---
## Goal
A consistent, clean UI foundation so every feature looks the same and owners only work inside `client/src/features/<module>/`.

## Read first
`docs/08-architecture-and-plan.md` (screens), `docs/09-execution-plan.md` §3

## Build (all in `client/src/`)
**Design tokens:** Tailwind theme with one primary colour (Odoo-like purple `#714B67`, plus a neutral grey scale), success/warning/danger/info colours, radius, spacing. Font: Inter (or system font). Put the choices in `tailwind.config` and use only these tokens.

**App wiring**
| File | Purpose |
|---|---|
| `lib/api.ts` | `api.get/post/patch/delete<T>(path, body/params)`. `credentials: "include"`, base `VITE_API_URL`. Non-2xx throws `ApiError { status, code, message, fields }` |
| `lib/format.ts` | `formatMoney(value, currency = "INR")`, `formatDate`, `formatPeriod` |
| `lib/form.ts` | `applyServerErrors(error, setError)`: maps `ApiError.fields` into React Hook Form |
| `app/providers.tsx` | QueryClient, Router, AuthProvider, Toaster |
| `app/auth-context.tsx` | `useAuth()` → `{ user, isLoading, login, logout, refresh }` (calls `/api/auth/me`) |
| `app/router.tsx` | public routes `/login /signup /forgot-password /reset-password/:token`; `/app/*` (ADMIN, INTERNAL) inside `AppLayout`; `/my/*` (PORTAL) inside `PortalLayout`. **Collects route arrays from each feature**: `features/<f>/routes.tsx` exports `export const productRoutes: RouteObject[]` |
| `app/nav.ts` | sidebar items `{ label, path, icon, roles }`. Admin-only items hidden for INTERNAL |
| `app/guards.tsx` | `<RequireAuth>`, `<RequireRole roles=[…]>`. Redirects to login or the right home |
| `app/layouts/` | `AppLayout` (sidebar + top bar with user menu), `PortalLayout` (top nav), `AuthLayout` (centered card) |

**Pre-create** `features/<f>/routes.tsx` for every feature with a placeholder page ("Coming soon: owner, task ID"), so owners replace the contents and the router never needs editing.

**UI kit** (`components/ui/`), each typed and with no external UI library:
`Button` (variants primary/secondary/danger/ghost, `loading`), `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `DateInput`, `FormField` (label + error text), `Card`, `PageHeader` (title, breadcrumbs, actions), `DataTable` (columns, rows, sorting header, row click, loading skeleton, empty state), `Pagination`, `SearchInput` (debounced), `Tabs`, `Badge` (state → colour map for all `SubscriptionState`/`InvoiceState` values), `StatusBar` (Odoo-style stepper: steps + current), `Modal`, `ConfirmDialog`, `Toast` / `useToast`, `KpiCard`, `EmptyState`, `Spinner`.

Add a `/app/ui-kit` dev page showing every component (handy for teammates and the demo).

## Acceptance criteria
- [ ] Logged-out user hitting `/app/...` → redirected to `/login`; PORTAL user hitting `/app` → redirected to `/my`
- [ ] Sidebar shows module links by role
- [ ] UI kit page renders every component in all variants
- [ ] An API validation error shows under the correct form field via `applyServerErrors`
- [ ] Layout works at phone width (portal especially)

## Out of scope
Real auth calls (M5/M8). Feature pages belong to their owners.
