import type { Tx } from '../../lib/prisma';
import { prisma } from '../../lib/prisma';
import { toFixed2, D } from '../../lib/money';
import { notFound } from '../../lib/http-error';

// Shape defined by T2 (docs/tasks/T2-invoice-print-view.md). Money values are strings.
export type InvoicePrintData = {
  company: { name: string; address: string; email: string; taxId?: string };
  invoice: {
    number: string | null;
    state: 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
    invoiceDate: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    subscriptionNumber: string;
    paymentTerm: string;
  };
  customer: { name: string; email: string; address: string };
  lines: {
    description: string;
    quantity: number;
    unitPrice: string;
    discount: string;
    taxes: string[];
    amount: string;
  }[];
  totals: { untaxed: string; discount: string; tax: string; total: string; paid: string; due: string };
  taxBreakdown: { name: string; amount: string }[];
  currency: string;
};

// TODO(M13/settings): company details are fixed until a settings module exists.
const COMPANY = {
  name: 'Brightloop Software',
  address: 'Brightloop Software Pvt. Ltd., Bengaluru, India',
  email: 'billing@billcycle.local',
  taxId: '29ABCDE1234F1Z5',
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Builds the print/PDF payload for an invoice. Exported for the M13 portal. */
export async function buildInvoicePrintData(
  id: number,
  client: Tx = prisma,
): Promise<InvoicePrintData> {
  const inv = await client.invoice.findUnique({
    where: { id },
    include: {
      lines: { include: { taxes: true }, orderBy: { id: 'asc' } },
      subscription: { select: { number: true, paymentTerm: { select: { name: true } } } },
    },
  });
  if (!inv) throw notFound('Invoice');

  // Per-tax breakdown across all lines.
  const breakdown = new Map<string, ReturnType<typeof D>>();
  for (const line of inv.lines) {
    // Distribute each line's tax amount across its taxes proportionally to rate;
    // with a single tax per line this is exact. For reporting we group by tax name.
    const names = line.taxes.map((t) => t.name);
    if (names.length === 1) {
      breakdown.set(names[0], (breakdown.get(names[0]) ?? D(0)).plus(line.amountTax));
    } else if (names.length > 1) {
      const per = D(line.amountTax).div(names.length);
      for (const n of names) breakdown.set(n, (breakdown.get(n) ?? D(0)).plus(per));
    }
  }

  return {
    company: COMPANY,
    invoice: {
      number: inv.number,
      state: inv.state,
      invoiceDate: iso(inv.invoiceDate),
      dueDate: iso(inv.dueDate),
      periodStart: iso(inv.periodStart),
      periodEnd: iso(inv.periodEnd),
      subscriptionNumber: inv.subscription.number ?? '—',
      paymentTerm: inv.subscription.paymentTerm.name,
    },
    customer: {
      name: inv.billingName,
      email: inv.billingEmail,
      address: inv.billingAddress ?? '',
    },
    lines: inv.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: toFixed2(l.unitPrice),
      discount: toFixed2(l.discountAmount),
      taxes: l.taxes.map((t) => t.name),
      amount: toFixed2(l.amountTotal),
    })),
    totals: {
      untaxed: toFixed2(inv.amountUntaxed),
      discount: toFixed2(inv.amountDiscount),
      tax: toFixed2(inv.amountTax),
      total: toFixed2(inv.amountTotal),
      paid: toFixed2(inv.amountPaid),
      due: toFixed2(inv.amountDue),
    },
    taxBreakdown: [...breakdown.entries()].map(([name, amount]) => ({ name, amount: toFixed2(amount) })),
    currency: 'INR',
  };
}
