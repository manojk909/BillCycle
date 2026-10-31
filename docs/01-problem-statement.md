# 01: Problem Statement (from PDF)

> Source: `Subscription_Management_System.pdf` (Odoo). This file restates the PDF closely. Interpretation lives in later docs.

**Tagline:** *Build one system to run plans, subscriptions and recurring billing in one place.*

---

## 1) The Challenge

Build **one unified software platform** that runs the full life of a subscription business: setting up products and plans, sending invoices, collecting payments and reporting revenue. It is the **digital backbone** of a company that earns money every month, not just once. The scenes in section 3 are things that happen in an ordinary billing month. The system should make each of them easy.

## 2) Meet Brightloop Software

- Sells **everything on subscription**: business software billed **monthly or yearly**, **add-ons** customers switch on and off, and some products with **variants**.
- Customers range from **small shops on monthly plans** to **large companies on yearly contracts**.
- **Admin** sets up products, plans, taxes and discounts.
- A **small internal team** handles customers day to day.
- **Customers** want to **see and manage their own subscriptions** without emailing anyone.

### How things run today (pain points)

| Area | Today |
|------|-------|
| Customer subscriptions | Tracked in a spreadsheet |
| Renewals | Remembered by whoever notices first |
| Invoices | Typed up by hand every month |
| Payments | Matched to invoices by scrolling bank statements |
| Revenue reports | Built manually at the end of each quarter |

**Result:** renewals get missed, invoices go out wrong, and **nobody can say how much recurring revenue the company actually has**.

## 3) A Month at Brightloop

The scenes run from a new customer creating an account to the finance lead reviewing the numbers. Each one is a problem someone at the company faces today.

### Scene A: A new customer signs up
- Account is created with **email + password**.
- **Each email belongs to only one account.**
- Password rules: **more than eight characters**, with **an uppercase letter**, **a lowercase letter** and **a special character**.
- Forgotten password → **reset link sent to the registered email**.
- Role-based visibility:
  - **Admin** controls the whole system.
  - **Internal staff** handle day-to-day work with **limited access**.
  - **Customers** see **only their own subscriptions and invoices**, through a **portal**.
  - **Only the admin can add a new staff member.**

### Scene B: Launching a new plan
- **Product:** name, type, sales price, cost price, notes.
- **Variants:** for example by brand. Choosing the **Odoo brand adds 560 to the price**.
- **Plan:** price, billing frequency (**daily, weekly, monthly, yearly**), **minimum quantity**, **availability dates**.
- Plan behaviour, set **per plan by the admin**:
  - some **close on their own** when they end;
  - others can be **closed early**, **paused**, or **renewed**.

### Scene C: Turning a quote into a subscription
- A sales rep starts from a **quotation template** that already holds the right **plan and product lines** and **stays valid for a set number of days**.
- Each **subscription** has: **number**, **customer**, **plan**, **start date**, **expiry date**, **payment terms**.
- **Lines:** product, quantity, unit price, taxes, amount.
- **Lifecycle:** `Draft → Quotation → Confirmed → Active → Closed`.
- **Anyone on the team** can see where a subscription stands.

### Scene D: Billing day
- **Hundreds of subscriptions** are due at once. No manual invoice typing.
- Each invoice is **created from its subscription**, with **customer details, product lines, taxes and totals** pre-filled.
- **Taxes are calculated automatically** from admin-defined rules.
- The team can **confirm, cancel, send or print** any invoice.
- **Invoice lifecycle:** `Draft → Confirmed → Paid`.
- **Nothing is billed twice or skipped.**

### Scene E: A customer asks for a better price
- **Only the admin** can create discount rules.
- Discount rule: **fixed amount or percentage**, **minimum purchase or quantity**, **start and end dates**, **usage limit**.
- Applies to **specific products** or **whole subscriptions**.
- Once it applies, it **appears on the next invoice automatically** and **stops when it expires or runs out**.

### Scene F: The money comes in
- Payments arrive by **different methods** on **different days**.
- Each payment is recorded with **method, amount, date, note**, **against the right invoice**.
- The team can see at any time **which invoices are paid and which are outstanding**, so **overdue** ones can be chased.

### Scene G: The finance lead, at the end of the month
- Questions: How many subscriptions are **active**? How much **revenue came in**, and how much is **still owed**? Which invoices are **overdue**?
- Wants **one place** showing active subscriptions, revenue, payments and overdue invoices, **with filters and a summary view**.
- **Performance:** with **thousands of subscriptions**, **every page responds in under 2 seconds**.
