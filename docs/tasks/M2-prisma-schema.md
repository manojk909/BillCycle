---
id: M2
title: Prisma schema for all entities, initial migration and base seed
assignee: manojk909
milestone: P0 Foundation
labels: area:foundation, area:database, type:feature, priority:must
depends: M1
---
## Goal
The complete database schema, so every module can be built in parallel without schema conflicts. **Database design is the most heavily judged area**, so make it clean.

## Read first
`docs/03-domain-model.md` (fields, state machines, indexes), `docs/04-business-rules.md`, `docs/07-assumptions-open-questions.md` (A3: plan price is a base-fee line)

## Build
`server/prisma/schema.prisma`: models in PascalCase, fields in camelCase, tables/columns mapped to snake_case with `@@map` / `@map`. IDs `Int @id @default(autoincrement())`. Every table has `createdAt`, `updatedAt`. Money is `Decimal @db.Decimal(12,2)`, rates `Decimal @db.Decimal(7,4)`.

Models (names are a contract other tasks rely on):
| Model | Key fields / constraints |
|---|---|
| `User` | `email @unique` (stored lowercased), `passwordHash`, `name`, `role Role`, `isActive`, `customerId Int? @unique`, `createdById` |
| `PasswordResetToken` | `userId`, `tokenHash @unique`, `expiresAt`, `usedAt?` |
| `Customer` | `name, email, phone?, companyName?, street?, city?, state?, zip?, country?, taxId?` |
| `ProductAttribute` | `name @unique` |
| `AttributeValue` | `attributeId, name, extraPrice` · `@@unique([attributeId, name])` |
| `Product` | `name, type ProductType, salesPrice, costPrice, notes?, isActive`, M2M `taxes Tax[]` |
| `ProductVariant` | `productId, sku?, isDefault`, M2M `values AttributeValue[]`. Price is **computed** (base + Σ extra), not stored |
| `Tax` | `name @unique, type TaxType, rate, isActive` |
| `PaymentTerm` | `name @unique, dueDays` |
| `PaymentMethod` | `name @unique, isActive` |
| `RecurringPlan` | `name, price, billingPeriod, billingInterval @default(1), minQuantity @default(1), startDate?, endDate?, autoClose, closable, pausable, renewable, isActive`, M2M `taxes Tax[]` (taxes for the plan line) |
| `QuotationTemplate` | `name, validityDays, planId, notes?` |
| `QuotationTemplateLine` | `templateId, variantId, quantity, description?` |
| `Subscription` | `number String? @unique`, `customerId, planId, templateId?, paymentTermId, salespersonId?, state SubscriptionState @default(DRAFT)`, `quantity` (plan seats ≥ plan.minQuantity), `startDate, expiryDate?, quotationValidUntil?, nextInvoiceDate?, pausedAt?, closedAt?, closeReason?, renewedFromId?`, stored totals `amountUntaxed, amountTax, amountTotal` |
| `SubscriptionLine` | `subscriptionId, variantId Int?` (null only for the plan line), `isPlanLine`, `description, quantity, unitPrice, isActive` (add-on toggle), M2M `taxes`, stored `amountUntaxed, amountTax, amountTotal` |
| `Invoice` | `number String? @unique` (set on confirm), `subscriptionId, customerId, state InvoiceState @default(DRAFT)`, `periodStart, periodEnd, invoiceDate, dueDate`, customer snapshot (`billingName, billingEmail, billingAddress`), `amountUntaxed, amountDiscount, amountTax, amountTotal, amountPaid, amountDue`, `sentAt?, confirmedAt?, cancelledAt?` |
| `InvoiceLine` | `invoiceId, variantId?, isPlanLine, description, quantity, unitPrice, discountAmount, amountUntaxed, amountTax, amountTotal`, M2M `taxes` |
| `DiscountRule` | `name, code? @unique, type DiscountType, value, scope DiscountScope, minPurchaseAmount?, minQuantity?, startDate, endDate, usageLimit?, timesUsed @default(0), isActive`, M2M `products Product[]`, M2M `customers Customer[]` (empty = all customers) |
| `DiscountUsage` | `discountId, invoiceId, subscriptionId, amount` · `@@unique([discountId, invoiceId])` |
| `Payment` | `invoiceId, methodId, amount, date, note?, recordedById` |
| `Sequence` | `code, year, nextValue` · `@@id([code, year])` |
| `BillingRun` | `upTo, startedAt, finishedAt?, created, skipped, failed, errors Json, triggeredById?` |
| `ActivityLog` | `entityType, entityId, action, message, userId?, createdAt` (chatter / audit) |

Indexes (see docs/03): `subscription(state)`, `subscription(customerId)`, `subscription(nextInvoiceDate, state)`, `invoice(state, dueDate)`, `invoice(customerId)`, `payment(invoiceId)`, `payment(date)`, `activityLog(entityType, entityId)`.

**Raw SQL in the migration** (create with `prisma migrate dev --create-only`, then edit):
- Partial unique index: `CREATE UNIQUE INDEX invoice_sub_period_uniq ON invoices (subscription_id, period_start) WHERE state <> 'CANCELLED';` (this is the "never bill twice" guarantee)
- CHECK constraints: quantities > 0, money ≥ 0, `end_date >= start_date` on plans and discounts

**Seed:** `prisma/seed.ts` calls one function per area from `prisma/seed/*.ts`, so other owners can add their own seed file without conflicts:
- `seed/core.ts` (this task): admin (from `SEED_ADMIN_*`), internal user `staff@billcycle.local / Staff@12345`, taxes (GST 18%, GST 5%), payment terms (Immediate 0, Net 15, Net 30), methods (Cash, Bank Transfer, Card, UPI, Cheque), 3 customers each with a portal user (`customer1..3@billcycle.local / Customer@123`)
- `seed/catalog.ts` (basic now, S-tasks may extend): attribute Brand {Odoo +560, Generic +0}; products Brightloop CRM (Service, 1200 / cost 400), Brightloop HR (Service, 900 / 300), Extra Storage 100GB (add-on, 199 / 50), Priority Support (add-on, 499 / 150); plans Starter Monthly (999, MONTHLY, min 1, pausable/closable/renewable), Business Yearly (9999, YEARLY, min 5, autoClose, renewable), Weekly Trial (99, WEEKLY, autoClose)
- Seeding must be idempotent (`upsert`)

## Acceptance criteria
- [ ] `npx prisma migrate reset` creates the schema and seeds without errors
- [ ] Inserting two non-cancelled invoices for the same subscription and period fails at DB level
- [ ] `npx prisma studio` shows all seeded data
- [ ] Short ER diagram (Mermaid) added to `docs/03-domain-model.md` (useful in the demo)
- [ ] Schema PR is reviewed by Sandhya and Shubham (they consume it)

## Out of scope
Business logic. Schema changes after merge go through small PRs, and the team is told.
