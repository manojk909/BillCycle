# 03: Domain Model

## Entity overview

```
User ──(role)──> {ADMIN, INTERNAL, PORTAL}
  │ 1
  │ (portal user ↔ customer)
  ▼ 1
Customer (Contact) 1 ──── * Subscription * ──── 1 RecurringPlan
                               │ 1                    ▲
                               │                      │ *
                               ├── * SubscriptionLine ──> ProductVariant * ── 1 Product
                               │          │                     │
                               │          └── * Tax             └── * AttributeValue ── 1 Attribute
                               │
                               └── * Invoice 1 ── * InvoiceLine ── * Tax
                                        │ 1
                                        └── * Payment ── 1 PaymentMethod

QuotationTemplate 1 ── * TemplateLine ──> ProductVariant
QuotationTemplate * ── 1 RecurringPlan
DiscountRule * ── * Product   (when scope = PRODUCTS)
DiscountRule 1 ── * DiscountUsage ── 1 Invoice
PaymentTerm 1 ── * Subscription / Invoice
```

## Entities and fields

### User
| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| email | string, **unique (case-insensitive)** | login |
| password_hash | string | bcrypt/argon2 |
| name | string | |
| role | enum `ADMIN` / `INTERNAL` / `PORTAL` | |
| customer_id | FK → Customer, nullable | set for PORTAL users |
| is_active | bool | |
| created_by | FK → User | must be ADMIN when role = INTERNAL |

### PasswordResetToken
`id, user_id, token_hash, expires_at, used_at`. Store only the hash of the token and allow each token to be used once.

### Customer (Contact)
`id, name, email, phone, company_name, address (street, city, state, zip, country), tax_id/GSTIN (optional)`

### Product
| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| type | enum `SERVICE` / `GOODS` | |
| sales_price | decimal(12,2) | base price |
| cost_price | decimal(12,2) | for margin reporting |
| notes | text | |
| default_tax_ids | M2M → Tax | |
| is_recurring | bool | true for subscription products |
| active | bool | archive flag |

### Attribute / AttributeValue / ProductVariant
- **Attribute**: `name` (e.g. Brand, Edition, Seats tier)
- **AttributeValue**: `attribute_id, name` (e.g. Odoo), `extra_price` (e.g. 560)
- **ProductVariant**: `product_id, attribute_value_ids (M2M), sku`, computed `price = product.sales_price + Σ extra_price`
- A product with no attributes gets one default variant, so lines always point at a variant.

### RecurringPlan
| Field | Type | Notes |
|-------|------|-------|
| name | string | e.g. "Monthly", "Yearly Pro" |
| price | decimal | see the assumption in [07](07-assumptions-open-questions.md#a3-plan-price-vs-product-price) |
| billing_period | enum `DAILY` / `WEEKLY` / `MONTHLY` / `YEARLY` | |
| billing_interval | int, default 1 | could-have |
| min_quantity | int, default 1 | |
| start_date / end_date | date, nullable | availability window |
| auto_close | bool | close at subscription expiry |
| closable | bool | customer/staff may close early |
| pausable | bool | |
| renewable | bool | |

### QuotationTemplate / TemplateLine
- Template: `name, validity_days, plan_id, notes`
- Line: `template_id, variant_id, quantity, description`

### PaymentTerm
`name, due_days` (e.g. Immediate = 0, Net 15, Net 30). Could later hold installments.

### Subscription
| Field | Type | Notes |
|-------|------|-------|
| number | string, unique | `SUB/YYYY/NNNNN`, assigned from a sequence on leaving Draft (or at create) |
| customer_id | FK | |
| plan_id | FK | |
| template_id | FK, nullable | origin |
| state | enum (below) | indexed |
| start_date | date | |
| expiry_date | date, nullable | end of contract; null = open-ended |
| quotation_valid_until | date | from template validity |
| payment_term_id | FK | |
| next_invoice_date | date | **indexed**, drives billing |
| last_invoiced_period_end | date | for idempotency/catch-up |
| paused_at / pause_reason | | |
| closed_at / close_reason | | |
| salesperson_id | FK → User | |
| amount_untaxed / amount_tax / amount_total | decimal | stored computed, for fast lists |

### SubscriptionLine
`subscription_id, variant_id, description, quantity, unit_price, tax_ids (M2M), discount_pct (manual, optional), amount_untaxed, amount_tax, amount_total, active (add-on toggle)`

### Tax
`name, type (PERCENT / FIXED), rate, price_included (bool), active`

### DiscountRule
| Field | Type | Notes |
|-------|------|-------|
| name / code | string | |
| type | enum `FIXED` / `PERCENT` | |
| value | decimal | |
| scope | enum `PRODUCTS` / `SUBSCRIPTION` | |
| product_ids | M2M | when scope = PRODUCTS |
| min_purchase_amount | decimal, nullable | |
| min_quantity | int, nullable | |
| start_date / end_date | date | |
| usage_limit | int, nullable | null = unlimited |
| times_used | int | incremented atomically |
| customer_ids / subscription_ids | M2M, optional | to target the customer who asked (see [07](07-assumptions-open-questions.md)) |
| active | bool | |

### DiscountUsage
`discount_id, invoice_id, subscription_id, amount, applied_at`. This is the audit trail, and lets cancelling an invoice give the usage back.

### Invoice
| Field | Type | Notes |
|-------|------|-------|
| number | string, unique | `INV/YYYY/NNNNN`, assigned **on Confirm** (Draft has none, so no gaps) |
| subscription_id | FK | |
| customer_id | FK | snapshot of billing address stored too |
| period_start / period_end | date | **UNIQUE(subscription_id, period_start)** where state ≠ cancelled |
| invoice_date / due_date | date | due = invoice_date + term days |
| state | enum `DRAFT` / `CONFIRMED` / `PAID` / `CANCELLED` | |
| amount_untaxed / amount_discount / amount_tax / amount_total | decimal | |
| amount_paid / amount_due | decimal | stored, kept in sync with payments |
| sent_at | timestamp | |

### InvoiceLine
`invoice_id, variant_id, description, quantity, unit_price, discount_amount, tax_ids, amount_untaxed, amount_tax, amount_total, is_discount_line`

### Payment / PaymentMethod
- PaymentMethod: `name` (Cash, Bank Transfer, Card, UPI, Cheque), `active`
- Payment: `invoice_id, method_id, amount, date, note, recorded_by`

## State machines

### Subscription
```
         send/confirm-quote          confirm                start date reached / first invoice
 DRAFT ─────────────────> QUOTATION ─────────> CONFIRMED ─────────────────────────────> ACTIVE
   │                         │  (expired → can't confirm)                               │   ▲
   └──── cancel ─────────────┴──────────────> CLOSED                          pause*    │   │ resume*
                                                ▲                                        ▼   │
                                                │   close early* / auto-close at expiry   PAUSED
                                                └──────────────────────────────── ACTIVE / PAUSED
* allowed only if plan.closable / plan.pausable. Renew* (plan.renewable): extends expiry_date, or creates a new subscription linked to the old one.
```

| From | To | Trigger | Guard |
|------|----|---------|-------|
| Draft | Quotation | "Send quotation" | has customer, plan, ≥1 line, qty ≥ plan.min_quantity |
| Quotation | Confirmed | "Confirm" (staff or customer accepts) | today ≤ quotation_valid_until, plan available on start_date |
| Confirmed | Active | start_date ≤ today (scheduler) or first invoice confirmed | |
| Active | Paused | "Pause" | plan.pausable |
| Paused | Active | "Resume" | |
| Active/Paused | Closed | "Close" | plan.closable, or the auto-close job when expiry_date < today and plan.auto_close |
| Draft/Quotation | Closed (Cancelled) | "Cancel" | |
| Active | Active (renewed) | "Renew" | plan.renewable |

> **PAUSED** is not in the PDF's list of states. The PDF does say plans can be "paused", so we model Paused as a sub-state of Active (a flag `is_paused`) or as an extra state. See [07](07-assumptions-open-questions.md).

### Invoice
```
DRAFT ──confirm──> CONFIRMED ──(amount_due = 0)──> PAID
  │                    │
  └──cancel──> CANCELLED <──cancel (only if no payments)──┘
```
- Draft is editable. Confirm assigns a number, locks the lines and sets the due date.
- Cancel a confirmed invoice only when no payments exist, and give back any discount usage.
- "Overdue" is derived, not stored: `state = CONFIRMED AND due_date < today AND amount_due > 0`.
- "Partially paid" is also derived: `CONFIRMED AND 0 < amount_paid < amount_total`.

## Key indexes (for NFR-01)
- `subscription(state)`, `subscription(next_invoice_date) WHERE state IN ('ACTIVE')`, `subscription(customer_id)`
- `invoice(state, due_date)`, `invoice(customer_id)`, `invoice(subscription_id, period_start)` unique
- `payment(invoice_id)`, `payment(date)`
- `user(lower(email))` unique
