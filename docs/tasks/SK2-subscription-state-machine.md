---
id: SK2
title: "Subscription state machine: send, confirm, activate, pause, resume, renew, close, cancel"
assignee: ShubhamKang
milestone: P1 Masters & Core
labels: area:subscriptions, type:feature, priority:must
depends: SK1, S5
---
## Goal
"It moves from Draft to Quotation to Confirmed to Active and finally to Closed, and anyone on the team should be able to see where it stands." Plus plan-controlled pause, close early and renew.

## Read first
`docs/03-domain-model.md` (Subscription state machine + transition table), `docs/04-business-rules.md` §8–9, `docs/07-assumptions-open-questions.md` A5–A7

## Build `server/src/modules/subscriptions/subscription-actions.ts`
Exported **service functions** (M13 portal and SK5 jobs call these, so don't put logic in controllers):
```ts
sendQuotation(id, actor)        // DRAFT → QUOTATION; guards: ≥1 line incl. plan line, qty ≥ min
confirmSubscription(id, actor)  // QUOTATION → CONFIRMED; guard: today ≤ quotationValidUntil; if startDate ≤ today → activate immediately
activateSubscription(id, actor) // CONFIRMED → ACTIVE; sets nextInvoiceDate = startDate (SK4 bills the first period)
pauseSubscription(id, actor, reason?)  // ACTIVE → PAUSED; plan.pausable
resumeSubscription(id, actor)   // PAUSED → ACTIVE; nextInvoiceDate = max(nextInvoiceDate, today)
renewSubscription(id, actor)    // ACTIVE|PAUSED; plan.renewable; expiryDate += (expiryDate − startDate)
closeSubscription(id, actor, reason) // ACTIVE|PAUSED → CLOSED; plan.closable, or actor = 'system' for auto-close
cancelSubscription(id, actor)   // DRAFT|QUOTATION → CLOSED with reason "Cancelled"
getAllowedActions(sub, plan, role): string[]
```
- One transition table (`TRANSITIONS`), checked by a single `assertTransition(from, action)` → `409 INVALID_TRANSITION` with a readable message
- Every transition runs in a transaction, sets timestamps (`pausedAt`, `closedAt`), writes `logActivity`
- Routes: `POST /api/subscriptions/:id/{send,confirm,activate,pause,resume,renew,close,cancel}` (staff), body `{ reason? }`
- Plan guards use S5 `assertPlanAllows`

## Acceptance criteria
- [ ] Vitest: every valid transition passes; every invalid one throws (table-driven test over all states × actions)
- [ ] Expired quotation can't be confirmed (clear error)
- [ ] Pause on a non-pausable plan → 422 `PLAN_ACTION_NOT_ALLOWED`
- [ ] Activity log shows each transition with user and time
