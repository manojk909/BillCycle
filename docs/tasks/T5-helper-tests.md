---
id: T5
title: Extra unit tests for money, tax and password helpers
assignee: trivedhchalla
milestone: P4 Hardening & Demo
labels: type:test, priority:could, independent
depends: M3, M5
---
## Goal
Raise confidence in the shared helpers everyone relies on. Reviewers score debugging skill and coding standards; good tests show both.

## Build
- `server/src/lib/money.test.ts`: rounding half-up (`0.005 → 0.01`), sums of many small decimals, no float drift (`0.1 + 0.2`), negative handling
- `server/src/lib/tax.test.ts`: price × qty rounding, multiple taxes, fixed tax per unit, discount before tax, zero quantity rejected
- `server/src/modules/auth/password.test.ts`: every policy rule incl. unicode letters, spaces, exactly 8 vs 9 chars
- Report any bug found as an issue (tag the owner); don't fix other people's code directly

## Acceptance criteria
- [ ] ≥ 30 new test cases, all passing (or failing tests linked to filed bug issues)
- [ ] `npm test` passes in `server/`
