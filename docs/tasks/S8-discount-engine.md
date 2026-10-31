---
id: S8
title: Discount engine (eligibility, calculation, atomic usage) with tests
assignee: Sandhya-Parmar09
milestone: P2 Money Flow
labels: area:discounts, type:feature, priority:must
depends: S7, M3
---
## Goal
"Once it applies, it should appear on the next invoice on its own … and stop when it expires or runs out." SK4 (invoice generation) calls this engine.

## Read first
`docs/04-business-rules.md` §5 (**exact rules**)

## Build `server/src/modules/discounts/discount-engine.ts`
```ts
export type EngineLine = {
  key: string;                // stable id for the line (e.g. subscriptionLine id or "plan")
  productId: number | null;   // null for the plan line
  quantity: Prisma.Decimal;
  untaxed: Prisma.Decimal;    // qty × unitPrice, before discount
};
export type DiscountContext = { invoiceDate: Date; customerId: number; subscriptionId: number };
export type DiscountResult = {
  lineDiscounts: Record<string, Prisma.Decimal>;      // key → discount amount (rounded, ≤ line untaxed)
  applied: { ruleId: number; name: string; amount: Prisma.Decimal }[];
};

export function applyDiscounts(lines: EngineLine[], rules: DiscountRuleWithRelations[], ctx: DiscountContext): DiscountResult; // PURE
export function loadCandidateRules(tx, ctx: DiscountContext): Promise<DiscountRuleWithRelations[]>;  // active, in date range, not exhausted, customer match
export function consumeUsage(tx, ruleId: number, usage: { invoiceId: number; subscriptionId: number; amount: Prisma.Decimal }): Promise<boolean>; // atomic conditional UPDATE + DiscountUsage insert; false if exhausted
export function releaseUsage(tx, invoiceId: number): Promise<void>; // on invoice cancel: decrement and delete usages
```
Rules (from docs/04 §5): product-level first (best single rule per line), then at most one subscription-level rule on the remaining amount; thresholds measured on matching lines; FIXED clamped to the base; FIXED product-scope amount split across matching lines proportionally (fix the rounding remainder on the last line); never negative.

**Push a stub first** (same signatures, returns no discounts) in the first hour of P2, so Shubham can integrate immediately. Then replace it with the real logic.

## Acceptance criteria (Vitest, ≥ 15 cases)
- [ ] Percent subscription discount; fixed subscription discount bigger than total → clamped
- [ ] Product-scope only hits matching lines; plan line (productId null) only gets subscription-scope discounts
- [ ] `minQuantity` / `minPurchaseAmount` met vs not met
- [ ] Out of date range, inactive, exhausted, other customer → not applied
- [ ] Two candidate rules → the better one is chosen
- [ ] Fixed split across 3 lines sums exactly to the rule amount
- [ ] `consumeUsage` with limit 1 called twice in parallel → exactly one `true` (integration test)
