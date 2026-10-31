# 06: Research Notes

Background on how existing products solve this, so our design choices match what reviewers (Odoo) will expect.

## 1. Odoo Subscriptions: the reference implementation
The problem statement is clearly modelled on Odoo's **Subscriptions** app (Sales + Accounting). The vocabulary lines up closely:

| PDF term | Odoo concept |
|----------|-------------|
| Plan with daily/weekly/monthly/yearly billing | **Recurring Plan** (`sale.subscription.plan`): billing period (number + unit), plus "Automatic closing", "Closable", "Pausable", "Renew" self-service options |
| Product type, sales price, cost, notes | `product.template`: Product Type, Sales Price, Cost, Internal Notes, "Recurring" checkbox |
| Variants "Brand: Odoo +560" | **Attributes and Variants**: attribute values carry a **Price Extra** |
| Quotation template valid N days | **Quotation Template**: "Quotation Validity (days)", Recurring Plan, product lines, optional products |
| Subscription number, customer, plan, start, expiry, payment terms | Subscription = a `sale.order` with `is_subscription`: Start Date, End Date, Next Invoice Date, Payment Terms |
| Draft → Quotation → Confirmed → Active → Closed | Odoo's stages: Quotation, Quotation Sent, In Progress, Paused, Closed, Churned/Upsell/Renewed |
| Invoice Draft → Confirmed → Paid | `account.move`: Draft → Posted, and payment state Not paid / Partial / **Paid** / In payment |
| Discount rules with min qty, dates, usage limit | **Discount and Loyalty** programs (promotions, coupons): rules with min qty/amount, validity dates, max usage, apply to specific products or whole order |
| Portal | Odoo's `/my/subscriptions` and `/my/invoices` portal pages |
| Users: admin / internal / portal | Odoo's three user types: **Internal**, **Portal**, **Public**, with Admin as an Internal user holding Settings rights |

**What this tells us:** reviewers will look for these Odoo patterns. Use Odoo-like labels, status bars across the top of forms, smart buttons (e.g. "Invoices (3)" on a subscription), list/kanban views with filters and group-by, and a chatter-style activity log.

Odoo-specific details worth copying:
- **Next Invoice Date** is shown on every subscription. Odoo's scheduled action "Subscription: generate recurring invoices" creates the invoices.
- Odoo computes **MRR** per subscription and reports MRR, churn and growth in the Subscriptions "Analysis" view.
- The **status bar widget** at the top of each form shows the lifecycle, and buttons change with state.
- Invoice **number assigned on post (confirm)**, not on draft.

## 2. Stripe Billing: an engineering reference
- **Invoice states:** `draft → open → paid`, plus `void` and `uncollectible`. Draft invoices sit for about an hour before finalization, so they can be edited before they lock. That's the same idea as our "generate as Draft, then confirm".
- **Idempotency keys** on every create call keep a retried request from charging twice. Our equivalent is the `(subscription_id, period_start)` unique constraint.
- **Billing cycle anchor:** monthly billing on the 31st goes to the last day of shorter months, then back to the 31st. We copy that month-end clamping.
- **Proration** on mid-cycle changes is a big source of complexity. Out of scope for our v1.
- **Coupons:** `percent_off` or `amount_off`, `duration` (once / repeating / forever), `max_redemptions`, `redeem_by`. This matches the PDF's "limit on how many times" and "end date".
- **Dunning / Smart Retries:** retry failed payments, email reminders, then mark the invoice uncollectible. The PDF's "chase overdue ones" points at a light version: an overdue list plus reminder emails.

## 3. Chargebee / Zoho Subscriptions
- Separate **Plans** (base recurring charge) from **Add-ons** (optional recurring extras attached to a plan). This is how "add-ons customers switch on and off" is usually modelled, and supports our assumption that plan price is the base fee and lines are add-ons ([07](07-assumptions-open-questions.md#a3-plan-price-vs-product-price)).
- Subscription statuses: `future, in_trial, active, non_renewing, paused, cancelled`. Pause is a first-class state there.

## 4. SaaS metrics the finance lead will want
| Metric | Definition |
|--------|------------|
| **Active subscriptions** | count where state = Active (optionally including Paused) |
| **MRR** (Monthly Recurring Revenue) | Σ over active subscriptions of their recurring amount **normalized to a month**: yearly ÷ 12, weekly × 52 ÷ 12, daily × 365 ÷ 12. Excludes tax and one-off charges, net of recurring discounts. |
| **ARR** | MRR × 12 |
| **Revenue (collected)** | Σ payments in the period (cash basis). This is the answer to "how much came in". |
| **Revenue (invoiced)** | Σ confirmed invoice totals in the period (accrual-ish) |
| **Outstanding (AR)** | Σ `amount_due` of confirmed invoices. This is the answer to "how much is still owed". |
| **Overdue** | Σ and count of `amount_due` where `due_date < today` |
| **AR aging** | Overdue split into buckets 1–30, 31–60, 61–90, 90+ days |
| **Churn (count)** | subscriptions closed in the period ÷ active at the start of the period |
| **ARPU** | MRR ÷ active customers |

Show MRR and ARR even though the PDF doesn't name them. "Nobody can say how much recurring revenue the company actually has" is exactly what MRR answers.

## 5. Performance at "thousands of subscriptions" (< 2 s)
Thousands is small for a relational DB. The risk is in how the app reads data, not the data volume.
- **Server-side pagination** (limit/offset, or keyset for big tables) on every list. Never load all rows to the client.
- **Indexes** on filter and sort columns (state, dates, customer_id). See [03](03-domain-model.md#key-indexes-for-nfr-01).
- **Store computed totals** on subscriptions and invoices (amount_total, amount_due) so lists and dashboards don't join to lines.
- **Dashboard:** one `GROUP BY` / `SUM … FILTER (WHERE …)` query per widget, not N+1 loops in app code. A short cache (30–60 s) or a materialized view is optional if needed.
- **Avoid N+1** in the ORM (eager-load customer and plan on list pages).
- **Billing run is a background job**, so pages don't wait on it. It shows progress or a run report.
- **Prove it:** a seed script generating 10k subscriptions and about 100k invoices, plus timing in the demo (DevTools network tab or `EXPLAIN ANALYZE`).

## 6. Security notes
- bcrypt (cost 10–12) or argon2id for passwords.
- Reset tokens: 32+ random bytes, store a SHA-256 hash, 15–60 min expiry, single use, invalidate other sessions on reset.
- Rate-limit login and forgot-password.
- Same message whether or not the email exists on forgot-password.
- Server-side authorization helpers (see [05](05-roles-permissions.md)).
- Email in dev: use a local SMTP catcher (Mailpit/MailHog) or Ethereal, so reset links and invoice emails can be demoed without real SMTP.

## 7. India-specific note (optional)
If we target INR and GST: taxes are usually CGST + SGST (intra-state) or IGST (inter-state), at slabs like 18% for software/SaaS. Our generic "tax rules" model covers this with a 9% + 9% group or one 18% rule. A tax group can be a could-have.

## Sources consulted (from general knowledge; verify if precise behaviour matters)
- Odoo 17/18 documentation: Sales → Subscriptions (Recurring Plans, Quotation Templates, Subscription Analysis), Accounting → Customer Invoices and Payments, Products → Attributes and Variants, Discount and Loyalty programs, Users and Access Rights.
- Stripe Billing docs: Invoices lifecycle, Subscriptions billing cycle, Coupons, Idempotent requests.
- Chargebee docs: Plans, Add-ons, Subscription statuses.
