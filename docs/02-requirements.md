# 02: Requirements

Each requirement traces to a scene in [01-problem-statement.md](01-problem-statement.md) (A to G).
Priority: **M** = must (stated in the PDF), **S** = should (strongly implied), **C** = could (nice to have, adds polish).

## Functional requirements

### Authentication and accounts (Scene A)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-AUTH-01 | Customers self-register with email + password. New sign-ups get the **Portal (customer)** role. | M |
| FR-AUTH-02 | Email is **unique** across all accounts. Compare case-insensitively after trimming. | M |
| FR-AUTH-03 | Password must be **> 8 characters** and contain ≥1 uppercase, ≥1 lowercase and ≥1 special character. Validate on client **and** server. | M |
| FR-AUTH-04 | Login with email + password. Store passwords as a slow hash (bcrypt or argon2). | M |
| FR-AUTH-05 | Forgot password sends a **reset link** to the registered email. The token is single-use and time-limited. | M |
| FR-AUTH-06 | Forgot password responds the same way whether or not the email exists, so it can't be used to discover accounts. | S |
| FR-AUTH-07 | Only **Admin** can create Internal (staff) users. | M |
| FR-AUTH-08 | Seed one Admin account at install time. | M |
| FR-AUTH-09 | Users can change their password and edit their profile (name, address, phone). | S |

### Products and variants (Scene B)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-PROD-01 | Admin CRUDs products: **name, type, sales price, cost price, notes**. | M |
| FR-PROD-02 | Product type at minimum: Service / Goods (Odoo uses Service, Consumable, Storable). | M |
| FR-PROD-03 | Admin defines **attributes** (e.g. Brand) with **values** (e.g. Odoo) and an **extra price** per value (e.g. +560). | M |
| FR-PROD-04 | Products have **variants**. Variant price = product sales price + sum of selected value extras. | M |
| FR-PROD-05 | A product can be archived instead of deleted when subscriptions reference it. | S |

### Recurring plans (Scene B)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-PLAN-01 | Admin CRUDs plans: **name, price, billing period** (Daily / Weekly / Monthly / Yearly), **minimum quantity**, **start date, end date** (availability). | M |
| FR-PLAN-02 | Per-plan options: **Auto-close** (closes itself at end), **Closable** (can close early), **Pausable**, **Renewable**. | M |
| FR-PLAN-03 | A plan can't be picked for a new subscription outside its availability window. | M |
| FR-PLAN-04 | Subscription quantity below the plan minimum is rejected. | M |
| FR-PLAN-05 | Optional billing interval (e.g. "every 3 months"). | C |

### Quotation templates (Scene C)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-TMPL-01 | CRUD quotation templates: **name, validity (days), recurring plan, product lines** (product/variant, qty, optional description). | M |
| FR-TMPL-02 | Creating a subscription from a template copies the plan and lines, and sets the **quotation expiry = today + validity days**. | M |
| FR-TMPL-03 | An expired quotation can't be confirmed until its date is extended. | S |

### Subscriptions (Scene C)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-SUB-01 | A subscription has: **auto number** (e.g. `SUB/2026/00042`), **customer, plan, start date, expiry date, payment terms**. | M |
| FR-SUB-02 | **Lines:** product (variant), quantity, unit price, taxes, amount (computed). | M |
| FR-SUB-03 | States: **Draft → Quotation → Confirmed → Active → Closed**, with guarded transitions (see [03](03-domain-model.md)). | M |
| FR-SUB-04 | Pause / Resume / Close early / Renew are only allowed when the plan permits them. | M |
| FR-SUB-05 | Auto-close when the expiry date passes if the plan has auto-close. | M |
| FR-SUB-06 | Every internal user can see the status (list with a state filter, plus a status bar on the form). | M |
| FR-SUB-07 | Computes and stores the **next invoice date**. | M |
| FR-SUB-08 | Customers can see their own subscriptions in the portal and, where the plan allows, pause, close or renew them and switch add-on lines on or off. | S |
| FR-SUB-09 | Activity log / chatter on each subscription (state changes, invoices). | C |
| FR-SUB-10 | Send the quotation to the customer by email or portal so they can accept it. | C |

### Taxes (Scene D)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-TAX-01 | Admin CRUDs tax rules: name, type (percentage / fixed), rate, active. | M |
| FR-TAX-02 | Taxes are assigned to products by default and copied onto lines, where they can be overridden. | M |
| FR-TAX-03 | Line tax is computed automatically. Invoice shows untaxed, tax and total. | M |
| FR-TAX-04 | Tax-included vs tax-excluded pricing flag. | C |

### Invoicing (Scene D)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-INV-01 | Generate invoices **from subscriptions** with customer details, lines, taxes, discounts and totals pre-filled. | M |
| FR-INV-02 | **Batch run:** generate invoices for all subscriptions due on or before a date (scheduler plus a manual "Run billing" button). | M |
| FR-INV-03 | **Idempotent:** at most one invoice per subscription per billing period. Missed periods are caught up, never skipped. | M |
| FR-INV-04 | Invoice states: **Draft → Confirmed → Paid**, plus **Cancelled**. | M |
| FR-INV-05 | Actions: **Confirm, Cancel, Send (email), Print (PDF)**. | M |
| FR-INV-06 | Confirmed invoices are immutable. Corrections go through cancel and re-issue (or a credit note, see C). | M |
| FR-INV-07 | Due date comes from the payment terms. | M |
| FR-INV-08 | Customers can view and download their invoices in the portal. | M |
| FR-INV-09 | Credit notes. | C |

### Discounts (Scene E)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-DISC-01 | **Admin only** CRUDs discount rules. | M |
| FR-DISC-02 | Fields: **type** (fixed / percentage), **value**, **min purchase amount** and/or **min quantity**, **start date, end date**, **usage limit**, **times used**. | M |
| FR-DISC-03 | Scope: **specific products** or **whole subscription**. | M |
| FR-DISC-04 | Applied **automatically** on invoice generation when eligible, shown as its own discount line or a per-line discount. | M |
| FR-DISC-05 | Stops applying after the end date or once the usage limit is reached. Usage is incremented atomically. | M |

### Payments (Scene F)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-PAY-01 | Record a payment against an invoice: **method, amount, date, note**. | M |
| FR-PAY-02 | Methods are configurable (Cash, Bank transfer, Card, UPI, Cheque…). | M |
| FR-PAY-03 | Invoice amount due = total − payments. Invoice becomes **Paid** when the amount due reaches 0. Partial payments are allowed. | M |
| FR-PAY-04 | Lists and filters for **Paid / Outstanding / Overdue** (overdue = confirmed, unpaid, past due date). | M |
| FR-PAY-05 | Overpayment is blocked, or the excess is kept as customer credit. | S |
| FR-PAY-06 | Customer pays online from the portal (mock gateway or sandbox). | C |

### Reporting (Scene G)
| ID | Requirement | Pri |
|----|-------------|-----|
| FR-REP-01 | Dashboard KPIs: **active subscriptions count, revenue collected, amount outstanding, overdue amount/count, MRR**. | M |
| FR-REP-02 | Filters: date range, customer, plan, product, state. | M |
| FR-REP-03 | Summary view (KPI cards plus grouped tables or charts) and drill-down lists. | M |
| FR-REP-04 | Overdue invoices list with days overdue (aging buckets 0–30 / 31–60 / 61–90 / 90+). | S |
| FR-REP-05 | CSV export. | C |

## Non-functional requirements
| ID | Requirement |
|----|-------------|
| NFR-01 | **Performance:** every page < **2 s** with **thousands** of subscriptions (test with ≥10k subs, ≥100k invoice lines). Server-side pagination, indexes, aggregate queries. |
| NFR-02 | **Security:** RBAC enforced **server-side** on every endpoint. Portal users are scoped to their own records. Hashed passwords. CSRF/XSS protection. |
| NFR-03 | **Data integrity:** money is stored as decimal or integer minor units, never float. DB transactions around invoicing and payments. Unique constraints for idempotency. |
| NFR-04 | **Auditability:** created/updated timestamps and users; state-change history. |
| NFR-05 | **Usability:** an internal user can create a subscription from a template in < 1 min. Status is visible at a glance. |
| NFR-06 | **Validation:** clear inline error messages (password rules, min qty, plan availability). |
| NFR-07 | **Responsive** UI, at least for the customer portal. |
| NFR-08 | **Seed/demo data** so a reviewer can walk the "month at Brightloop" story end to end. |
