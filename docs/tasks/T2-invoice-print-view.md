---
id: T2
title: Printable invoice view (React component + print CSS)
assignee: trivedhchalla
milestone: P2 Money Flow
labels: area:invoicing, area:ui, type:feature, priority:must, independent
depends:
---
## Goal
"The team can … print any invoice." A clean A4 invoice that also works with the browser's "Save as PDF". No PDF library or external service.

## Build `client/src/features/invoices/print/`
- `InvoicePrint.tsx`: `export function InvoicePrint({ data }: { data: InvoicePrintData })`
- `invoice-print.css` (or Tailwind `print:` classes): A4 page, 15 mm margins, hides app chrome when printing, no colour-only meaning (works in B/W)
- `types.ts` exporting `InvoicePrintData` (exact shape below; SK6 builds this on the server)
- `mock.ts` with 2 sample objects (one paid with discount and 2 taxes, one draft with a long line list) for development
- A dev route or page showing the mock (e.g. `/app/ui-kit/invoice-print`)

Layout: company block (top-left) + "INVOICE" title, number (or "DRAFT"), dates (top-right); Bill-to block; period "Service period: 1 Nov 2026 – 30 Nov 2026" + subscription number + payment term; lines table (description, qty, unit price, discount, taxes, amount); tax breakdown; totals box (Untaxed, Discount, Tax, **Total**, Paid, **Amount due**); status stamp (PAID green / DRAFT grey / CANCELLED red); footer note. Long tables continue on page 2 with repeated header.

```ts
export type InvoicePrintData = {
  company: { name: string; address: string; email: string; taxId?: string };
  invoice: { number: string | null; state: 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
             invoiceDate: string; dueDate: string; periodStart: string; periodEnd: string;
             subscriptionNumber: string; paymentTerm: string };
  customer: { name: string; email: string; address: string };
  lines: { description: string; quantity: number; unitPrice: string; discount: string;
           taxes: string[]; amount: string }[];
  totals: { untaxed: string; discount: string; tax: string; total: string; paid: string; due: string };
  taxBreakdown: { name: string; amount: string }[];
  currency: string; // "INR"
};
```
Money values arrive as strings (e.g. `"1760.00"`). Format them with `formatMoney` from `client/src/lib/format.ts` (or a local helper until M4 lands).

## Acceptance criteria
- [ ] Both mocks look clean in Chrome print preview (A4), with no clipped content
- [ ] Draft shows "DRAFT" and no number
- [ ] Screenshot of the print preview attached to the PR
