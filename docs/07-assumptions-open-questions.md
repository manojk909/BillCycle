# 07: Assumptions and Open Questions

The PDF leaves several things open. Each item below has our **working assumption** (what we'll build unless told otherwise) and a note on why. Check these with the problem setters or mentors if possible.

## Assumptions

### A1. "More than eight characters"
Read literally as **≥ 9**. Many similar specs mean "at least 8". Keep the minimum in a single constant so it's a one-line change.

### A2. No digit required in passwords
The PDF lists uppercase, lowercase and special only. We won't require a digit, but digits are allowed.

### A3. Plan price vs product price
The PDF gives a **price on the plan** *and* a **sales price on the product**, with subscription lines carrying their own unit price. Options:
1. **(Chosen)** Plan price is the **base recurring fee** for the subscription and appears as the first invoice line ("Plan: Pro Monthly × qty"). Product lines are **add-ons / extra products**, priced at the variant price. This matches Brightloop's "software + add-ons switched on and off" and the Chargebee plan + add-on model.
2. Odoo-style: the plan only sets the billing period. The line unit price comes from the product (optionally a per-plan price list).
3. Plan price is a default that prefills line unit prices.

Option 1 uses every field the PDF mentions in a way that's easy to explain. If mentors prefer Odoo semantics, set the plan price to 0 and it becomes option 2.

### A4. Minimum quantity
Applies to the **plan line quantity** (seats). Add-on lines have their own qty ≥ 1.

### A5. "Paused" state
The PDF's lifecycle has no Paused state, but plans can be paused. We model **Paused as an extra state** between Active and Closed (shown in the status bar only when relevant). Paused subscriptions are not billed.

### A6. Renew
Renew **extends the expiry date** by the original contract length (expiry − start) and keeps billing. Option B (a new linked subscription) is noted in [04 §9](04-business-rules.md#9-renewal-planrenewable).

### A7. When does Confirmed become Active?
On `start_date ≤ today` (daily job), or immediately on confirm if the start date is today or earlier. The first invoice is generated at that point.

### A8. Billing in advance
Each period is invoiced at its start. No proration in v1.

### A9. Invoice "Cancel"
Allowed from Draft or Confirmed, **only if no payments** are recorded. Cancelled is a terminal state not listed in the PDF.

### A10. Partial payments
Allowed. Invoice stays Confirmed and shows "Partially paid" until fully paid. Overpayments are blocked.

### A11. Discount usage
One use = one invoice. Count at generation, give it back on cancel. One subscription-level and one product-level rule at most per invoice/line, choosing the best for the customer.

### A12. Discount targeting
The scene says "a **customer** wants a discount". Rules are global by default, with optional **customer restriction** so the admin can create a rule just for that customer.

### A13. Customer vs user
One portal user ↔ one customer record. Staff can create customers without logins and optionally invite them.

### A14. Currency
Single company currency (INR or USD, set in Settings). No multi-currency.

### A15. Internal users and reports
Internal users can see the dashboard. Cost price and margins are admin-only.

### A16. Email delivery
Real SMTP is configurable. Dev and demo use a mail catcher. "Send invoice" emails a PDF attachment or a portal link.

### A17. Online payment
Out of scope for must-have. Payments are recorded manually by staff. A portal "Pay now" with a mock gateway is a could-have.

## Open questions for mentors
1. Is a specific **tech stack** required or encouraged (Odoo module in Python/OWL vs any stack)? This decides a lot. See [08](08-architecture-and-plan.md).
2. Is the plan price a base fee (A3 option 1) or only a billing rule (option 2)?
3. Should invoices auto-confirm and auto-send on billing day, or be reviewed as drafts first?
4. Should customers be able to **self-subscribe** from the portal (pick a plan and checkout), or only manage subscriptions staff created?
5. Is proration on mid-period changes expected?
6. Is "Closed" one state, or should we tell apart Expired / Cancelled / Churned (close reasons)?
7. Any expectation on hosting / deployment for the demo?
8. Is "≥ 9 chars" correct, or "≥ 8"?
