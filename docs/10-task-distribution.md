# 10: Task Distribution

Ownership is by **vertical module**: each person builds both the backend and the frontend of their module. Full specs: [`docs/tasks/`](tasks/README.md). Each spec equals one GitHub issue.

| Member | GitHub | Owns | Tasks |
|---|---|---|---|
| **Manoj Kharkar** (lead) | `manojk909` | Foundation (scaffold, **DB schema**, server core, UI shell + kit), auth and roles, users, customers, payments, reports + dashboard, customer portal, integration | 14 (M1–M14) |
| **Sandhya Parmar** | `Sandhya-Parmar09` | Catalog (attributes, products, variants), taxes / payment terms / methods, plans, quotation templates, discount rules + engine | 8 (S1–S8) |
| **Shubham Kang** | `ShubhamKang` | Subscriptions (API, lifecycle, UI), invoice generation, billing run + scheduler, invoice actions + UI | 7 (SK1–SK7) |
| **Challa Trivedh Kumar** | `trivedhchalla` | Travelling, so **small, independent, offline-friendly** work: period math, print view, email templates, perf seed, tests | 5 (T1–T5) |

## Issues
`#` = GitHub issue number (filled in after the issues are created).

| ID | # | Task | Owner | Phase | Depends on |
|---|---|---|---|---|---|
| M1 | | Scaffold server and client projects | Manoj | P0 | — |
| M2 | | Prisma schema, migration, base seed | Manoj | P0 | M1 |
| M3 | | Server core: errors, validation, pagination, sequences, money/tax, router stubs | Manoj | P0 | M1 |
| M4 | | Client shell, routing, auth context, UI kit | Manoj | P0 | M1 |
| M5 | | Auth API: signup, login, logout, me | Manoj | P1 | M2, M3 |
| M6 | | Forgot / reset password + mailer | Manoj | P1 | M5 |
| M7 | | RBAC middleware, portal scoping, users | Manoj | P1 | M5, M4 |
| M8 | | Auth pages | Manoj | P1 | M4, M5, M6 |
| M9 | | Customers API + UI | Manoj | P1 | M3, M4, M7 |
| M10 | | Payments API + UI | Manoj | P2 | SK6, S4 |
| M11 | | Reports API (KPIs, MRR, trend, aging) | Manoj | P3 | M10, SK5 |
| M12 | | Dashboard UI | Manoj | P3 | M11, M4 |
| M13 | | Customer portal (API + pages) | Manoj | P3 | M7, SK2, SK6, T2 |
| M14 | | Integration, hardening, README, demo | Manoj | P4 | M12, M13, SK7, S8, T4 |
| S1 | | Attributes and values | Sandhya | P1 | M2, M3, M4 |
| S2 | | Products and variants API | Sandhya | P1 | S1 |
| S3 | | Products UI + VariantPicker | Sandhya | P1 | S2, M4 |
| S4 | | Taxes, payment terms, payment methods | Sandhya | P1 | M2, M3, M4 |
| S5 | | Recurring plans | Sandhya | P1 | M2, M3, M4, S4 |
| S6 | | Quotation templates | Sandhya | P1 | S3, S5 |
| S7 | | Discount rules CRUD (admin only) | Sandhya | P2 | S2, M9 |
| S8 | | Discount engine + tests | Sandhya | P2 | S7, M3 |
| SK1 | | Subscriptions API | Shubham | P1 | M2, M3 |
| SK2 | | Subscription state machine | Shubham | P1 | SK1, S5 |
| SK3 | | Subscriptions UI | Shubham | P1 | SK1, SK2, M4, S3 |
| SK4 | | Invoice generation service | Shubham | P2 | SK2, S8, T1 |
| SK5 | | Billing run + scheduler | Shubham | P2 | SK4 |
| SK6 | | Invoice API and actions | Shubham | P2 | SK4 |
| SK7 | | Invoices UI | Shubham | P2 | SK6, M4, T2 |
| T1 | | Billing period math | Trivedh | P1 | — |
| T2 | | Printable invoice view | Trivedh | P2 | — |
| T3 | | Email templates | Trivedh | P2 | — |
| T4 | | Perf seed + report | Trivedh | P3 | M2 |
| T5 | | Extra unit tests for helpers | Trivedh | P4 | M3, M5 |

## Dependency map

```
                 ┌─ M2 schema ──┬──────────────────────────────────────────────┐
M1 scaffold ─────┼─ M3 core ────┤                                              │
                 └─ M4 UI shell ┤                                              │
                                ├─ M5 auth ─┬─ M6 reset ─ M8 auth pages         │
                                │           └─ M7 RBAC ─ M9 customers ─┐       │
                                │                                       │       │
                                ├─ S1 attrs ─ S2 products ─ S3 UI ─┐    │       │
                                ├─ S4 taxes ─ S5 plans ────────────┼─ S6 templates
                                │                  │               │    │
                                │                  │      S7 discounts ◄┘─ S8 engine ─┐
                                ├─ SK1 subs API ─ SK2 states ─ SK3 UI                 │
                                │                     │                               │
                 T1 period ─────┼─────────────────────┴──────────── SK4 invoice gen ◄─┘
                                │                                    ├─ SK5 billing run ─┐
                                │                                    └─ SK6 invoice API ─┼─ SK7 UI (+T2)
                                │                                          │             │
                                │                                     M10 payments ─ M11 reports ─ M12 dashboard
                                │                          M13 portal ◄─ SK2, SK6, T2
                                └─ T4 perf seed                                   M14 integration ◄─ everything
```

### What Manoj blocks (do these first)
| Your task | Unblocks |
|---|---|
| **M1 scaffold** | everyone (no code can merge without it) |
| **M2 schema** | S1, S4, S5, SK1, T4 (every backend task) |
| **M3 server core** | S1, S4, S5, S8, SK1 (validation, errors, money/tax, router stubs) |
| **M4 UI shell + kit** | S1, S3, S4, S5, SK3 (every UI task) |
| M7 RBAC | everyone's role guards (until it's merged, they leave a `// TODO(M7)` guard) |
| M9 customers | SK3 customer picker, S7 customer restriction |
| M10 payments | SK7 "Register payment" button, M11 |

### What Manoj waits on
| Your task | Waits on |
|---|---|
| M10 payments | SK6 (invoices exist with `amountDue`), S4 (payment methods) |
| M11 reports | M10, SK5 (real invoices from billing), T1 `toMonthlyFactor` (has fallback) |
| M13 portal | SK2 service functions, SK6 print-data builder, T2 print view |
| M14 integration | everything |

### Critical path
**M1 → M2/M3 → SK1 → SK2 → SK4 → SK5/SK6 → M10 → M11 → M12 → M14**
S5 (plans) and S8 (discount engine) feed SK2 and SK4, so Sandhya should finish S4 → S5 early in P1 and **push an S8 stub** at the start of P2.

### Trivedh safety rule
Nothing on the critical path waits on Trivedh. Every consumer of his work has a fallback:
| Trivedh task | Consumer | Fallback until merged |
|---|---|---|
| T1 period math | SK4, SK5, M11 | temporary `addPeriod` marked `// TODO(T1)` |
| T2 print view | SK7, M13 | plain HTML table |
| T3 email templates | M6, SK6 | inline simple HTML |

## Handoff contracts
| Producer → Consumer | Contract |
|---|---|
| M3 → all | `validate`, `HttpError`, `paginated`, `money`, `computeLine`, `nextNumber`, `logActivity` |
| M4 → all UI | UI kit, `api.ts`, `applyServerErrors`, `features/<f>/routes.tsx` pattern |
| M7 → all | `requireRole`, `adminOnly`, `staff`, `portalOnly`, `customerScope` |
| S2/S3 → SK1, SK3, S6 | `variantPrice`, `/products/variants/options`, `<VariantPicker>` |
| S5 → SK1, SK2 | `isPlanAvailable`, `assertPlanAllows`, `/plans/options?availableOn=` |
| S8 → SK4, SK6 | `loadCandidateRules`, `applyDiscounts`, `consumeUsage`, `releaseUsage` |
| SK1/SK2 → M13, SK5 | `recomputeSubscription`, `pause/resume/close/renew/confirmSubscription` |
| SK6 → M10, M13, SK5 | `confirmInvoice`, `cancelInvoice`, `buildInvoicePrintData` |
| M10 → SK6, SK7, M11 | `paymentStatus`, `<RegisterPaymentModal>`, `<PaymentHistory>` |
| T1 → SK4, SK5, M11 | `addPeriod`, `periodEnd`, `periodStartsUntil`, `toMonthlyFactor` |
| T2 → SK7, M13 | `<InvoicePrint data={InvoicePrintData}>` |
| T3 → M6, SK6, M9 | `resetPasswordEmail`, `invoiceSentEmail`, `overdueReminderEmail`, `portalInviteEmail` |
