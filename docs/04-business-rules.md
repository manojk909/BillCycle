# 04: Business Rules and Calculations

## 1. Password policy (FR-AUTH-03)
```
len(pw) > 8                     # i.e. at least 9, per the literal reading of "more than eight"
and re.search(r"[A-Z]", pw)
and re.search(r"[a-z]", pw)
and re.search(r"[^A-Za-z0-9]", pw)   # special = anything that isn't a letter or digit
```
A digit is **not** required by the spec. Show a live checklist under the password field.

## 2. Pricing
- **Variant unit price** = `product.sales_price + Σ attribute_value.extra_price`
  - Example: Product "CRM Suite" at 1,200, variant Brand = Odoo (+560) → **1,760**.
- **Line untaxed** = `quantity × unit_price − line_discount`
- **Rounding:** round each line to 2 dp (half-up), then sum. Totals are always a sum of rounded lines, so the invoice adds up when checked by hand.

## 3. Tax
For each line and each tax on it:
- `PERCENT`, excluded: `tax = line_untaxed × rate / 100`
- `PERCENT`, price-included (could-have): `untaxed = price / (1 + rate/100)`, `tax = price − untaxed`
- `FIXED`: `tax = rate × quantity`

Tax is computed **after** discounts. Multiple taxes on one line are each computed on the untaxed base (no tax-on-tax).
Invoice: `amount_tax = Σ line taxes`, `amount_total = amount_untaxed + amount_tax`.

## 4. Billing engine (Scene D, "nothing billed twice or skipped")

### Periods
`next_period_end = add(period_start, billing_period × interval) − 1 day`
- Monthly: add calendar months and clamp the day to month end (Jan 31 → Feb 28/29 → Mar 31, keeping the *anchor* day from start_date).
- Yearly: Feb 29 anchors to Feb 28 in non-leap years.
- Weekly: +7 days. Daily: +1 day.

### Billing run (scheduler + manual button)
```
for sub in subscriptions where state = ACTIVE and not paused and next_invoice_date <= run_date:
    while sub.next_invoice_date <= run_date and (sub.expiry_date is null or sub.next_invoice_date <= sub.expiry_date):
        BEGIN TRANSACTION
          lock sub row (SELECT … FOR UPDATE)
          period_start = sub.next_invoice_date
          if invoice exists for (sub, period_start) and not cancelled: skip   # idempotency
          create DRAFT invoice from sub lines (customer snapshot, lines, taxes)
          apply eligible discounts (§5)
          sub.next_invoice_date = period_end + 1 day
        COMMIT
```
- **No double billing:** DB unique constraint on `(subscription_id, period_start)` for non-cancelled invoices, plus a row lock. Re-running the job is safe.
- **No skipping:** the `while` loop catches up every missed period if the job didn't run (server down or a long weekend).
- **Batch size:** process in chunks of about 200, one transaction per subscription, so one failure doesn't roll back the whole run. Log failures and show them in a "billing run report".
- **Auto-confirm option** (setting): generated invoices go straight to Confirmed and get emailed, or stay in Draft for review. Default to **Draft + bulk confirm** so staff can review.
- **Billing timing:** bill **in advance** (at the start of the period). This is the norm for SaaS and matches Odoo.
- **Paused subscriptions** are not billed. On resume, `next_invoice_date` is moved forward to the resume date (paused time isn't billed).
- **Proration** for mid-period upgrades/add-ons is out of scope for v1 (could-have). Add-on changes take effect from the next period.

### First invoice
On Confirm (or when it becomes Active), generate the first invoice for `[start_date, first_period_end]` and set `next_invoice_date` to the next period start.

## 5. Discounts (Scene E)

### Eligibility, checked at invoice generation
A rule applies when **all** of these hold:
1. `active` and `start_date ≤ invoice_date ≤ end_date`
2. `usage_limit is null or times_used < usage_limit`
3. Scope match:
   - `SUBSCRIPTION` → the whole invoice
   - `PRODUCTS` → only lines whose product is in `product_ids`
4. Thresholds over the matching lines:
   - `min_purchase_amount` → Σ matching line untaxed ≥ threshold
   - `min_quantity` → Σ matching line qty ≥ threshold
5. Target match, if the rule is restricted to customers or subscriptions

### Calculation
- `PERCENT`: `discount = base × value / 100`
- `FIXED`: `discount = min(value, base)`, so the total never goes negative
- PRODUCTS scope: split a fixed amount across matching lines in proportion to line amount, so tax is recomputed correctly per line.
- Show the discount on the invoice (a per-line discount column, or a "Discount: <rule>" line).

### Stacking (assumption)
- At most **one subscription-level rule** per invoice: pick the best for the customer.
- At most **one product-level rule per line**: pick the best for that line.
- Product-level discounts apply first, then the subscription-level discount on the remaining amount.

### Usage counting
- One **use** = one invoice the rule was applied to (not one per line).
- Increment with `UPDATE … SET times_used = times_used + 1 WHERE id = ? AND (usage_limit IS NULL OR times_used < usage_limit)`. If no row is updated, the rule ran out, so skip it. This is safe under concurrency.
- Write a `DiscountUsage` row. If the invoice is **cancelled**, decrement the count and delete the usage row.
- Usage is counted when the invoice is **generated** (Draft). Counting on Confirm also works, but then Draft invoices could exceed the limit. We count at generation and give the use back on cancel.

## 6. Payment terms and due date
`due_date = invoice_date + payment_term.due_days`. Defaults: Immediate (0), Net 15, Net 30. The subscription's term is copied onto each invoice.

## 7. Payments (Scene F)
- Can only be recorded against **Confirmed** (not Draft or Cancelled) invoices.
- `amount > 0`, and `amount ≤ amount_due` (block overpayment in v1).
- After each payment: `amount_paid = Σ payments`, `amount_due = total − amount_paid`. If `amount_due == 0`, then `state = PAID`.
- Deleting or voiding a payment recomputes these and can move the invoice back from PAID to CONFIRMED.
- Payment status, derived for filters:

| Status | Condition |
|--------|-----------|
| Paid | state = PAID |
| Partially paid | CONFIRMED and 0 < amount_paid < total |
| Outstanding | CONFIRMED and amount_due > 0 and due_date ≥ today |
| Overdue | CONFIRMED and amount_due > 0 and due_date < today |

## 8. Subscription lifecycle jobs (daily scheduler)
1. **Activate:** Confirmed with `start_date ≤ today` → Active.
2. **Bill:** billing run (§4).
3. **Auto-close:** Active/Paused, `plan.auto_close`, `expiry_date < today` → Closed (reason "Expired").
4. **Expire quotations:** Quotation with `quotation_valid_until < today` → flagged as expired (still visible, can't be confirmed).
5. **Renewal reminders** (could-have): email N days before expiry when `plan.renewable`.

## 9. Renewal (plan.renewable)
Option A, used in v1: extend `expiry_date` by one contract length and keep the same subscription number.
Option B (Odoo-style): close the old subscription and create a linked new one (`renewed_from_id`). This is better for history.
Renewing after expiry is allowed only if the subscription is not yet Closed, or within a grace period.

## 10. Numbering
Sequences per document type and year: `SUB/2026/00001`, `INV/2026/00001`. Invoice numbers are assigned **on Confirm** so cancelled drafts don't leave gaps, which matters for audit in many tax regimes, including India GST.

## 11. Edge cases checklist
- [ ] Same email in different case at signup → rejected.
- [ ] Reset link used twice or expired → rejected.
- [ ] Portal user guesses another subscription ID in the URL → 403/404.
- [ ] Plan's end_date passes while subscriptions on it are active → existing subscriptions continue. The plan just can't be chosen for new ones.
- [ ] Quantity < plan.min_quantity → validation error.
- [ ] Billing job runs twice at the same time → no duplicate invoices (unique constraint and lock).
- [ ] Billing job didn't run for 3 days → daily plans get 3 invoices, not 1.
- [ ] Month-end anchors (start Jan 31).
- [ ] Discount usage limit 1, two invoices generated in parallel → only one gets it.
- [ ] Fixed discount larger than the line → clamp at 0.
- [ ] Partial payment, then full payment → Paid. Remove a payment → back to Confirmed.
- [ ] Cancel an invoice that has payments → blocked.
- [ ] Subscription closed mid-period → no further invoices. No refund in v1.
- [ ] Product archived → still shown on old invoices, can't be added to new lines.
