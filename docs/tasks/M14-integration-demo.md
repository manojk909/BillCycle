---
id: M14
title: "Integration, hardening, README and demo rehearsal"
assignee: manojk909
milestone: P4 Hardening & Demo
labels: area:foundation, type:chore, priority:must
depends: M12, M13, SK7, S8, T4
---
## Goal
Ship a demo that runs clean end to end, twice.

## Build / do
- Enable branch protection on `main` (PR + 1 approval) after P0
- Weekly-style checkpoints: merge everything, run the demo script in `docs/08-architecture-and-plan.md`, file bugs as issues
- Security pass: every route has `authenticate` + a role guard; portal routes scoped; no secrets in the repo; helmet + CORS correct
- Validation pass: try bad input on every form (empty, too long, negative numbers, past or future dates)
- Performance pass with the T4 dataset; add indexes where `EXPLAIN ANALYZE` shows sequential scans
- Final `README.md`: features, screenshots, setup, demo credentials, architecture diagram, ER diagram link, team and module ownership
- Demo seed: `seed/demo.ts` producing a realistic "month at Brightloop" (subscriptions in every state, invoices paid, partial and overdue)
- Rehearse the demo split from `docs/09-execution-plan.md` §8

## Acceptance criteria
- [ ] Fresh clone → README → working app in < 10 minutes
- [ ] Demo script passes twice without manual DB fixes
- [ ] No open `priority:must` issues
