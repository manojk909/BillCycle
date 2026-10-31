import type { PrismaClient, SubscriptionState, Tax } from '@prisma/client';
import { computeLine, sumTotals, type TaxInput } from '../../src/lib/tax';
import { D, toFixed2 } from '../../src/lib/money';
import { nextNumber } from '../../src/lib/sequence';

// "A month at Brightloop": subscriptions in every state and invoices that are paid, partial, outstanding and overdue.
// Dates are relative to today so the demo always has current data.

const DAY = 86_400_000;
const now = new Date();
const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const monthStart = (offset: number) =>
  new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const addMonths = (d: Date, n: number) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
const taxInputs = (taxes: Tax[]): TaxInput[] =>
  taxes.map((t) => ({ id: t.id, name: t.name, type: t.type, rate: t.rate }));

type LineSpec = {
  variantId: number | null;
  isPlanLine: boolean;
  description: string;
  quantity: number;
  unitPrice: string;
  taxes: Tax[];
};

export async function seedDemo(prisma: PrismaClient) {
  if (await prisma.subscription.count()) {
    console.log('  demo: subscriptions exist, skipped');
    return;
  }

  const plans = await prisma.recurringPlan.findMany({ include: { taxes: true } });
  const plan = (name: string) => plans.find((p) => p.name === name)!;
  const variants = await prisma.productVariant.findMany({
    include: { product: { include: { taxes: true } }, values: { include: { attribute: true } } },
  });
  const variant = (product: string, sku?: string) =>
    variants.find((v) => v.product.name === product && (sku ? v.sku === sku : v.isDefault))!;
  const terms = await prisma.paymentTerm.findMany();
  const term = (name: string) => terms.find((t) => t.name === name)!;
  const methods = await prisma.paymentMethod.findMany();
  const method = (name: string) => methods.find((m) => m.name === name)!;
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: 'staff@billcycle.local' } });

  const customer = async (email: string, data?: { name: string; companyName: string; city: string }) =>
    (await prisma.customer.findFirst({ where: { email } })) ??
    prisma.customer.create({ data: { email, country: 'India', ...data! } });

  const addon = (v: (typeof variants)[number], quantity: number): LineSpec => {
    const extras = v.values.reduce((s, val) => s.plus(val.extraPrice), D(0));
    const label = v.values.length
      ? ` (${v.values.map((x) => `${x.attribute.name}: ${x.name}`).join(', ')})`
      : '';
    return {
      variantId: v.id,
      isPlanLine: false,
      description: v.product.name + label,
      quantity,
      unitPrice: toFixed2(D(v.product.salesPrice).plus(extras)),
      taxes: v.product.taxes,
    };
  };

  async function subscription(opts: {
    customerId: number;
    planName: string;
    quantity: number;
    start: Date;
    state: SubscriptionState;
    termName: string;
    addons?: LineSpec[];
    expiry?: Date;
    closeReason?: string;
  }) {
    const p = plan(opts.planName);
    const lines: LineSpec[] = [
      {
        variantId: null,
        isPlanLine: true,
        description: `Plan: ${p.name}`,
        quantity: opts.quantity,
        unitPrice: toFixed2(p.price),
        taxes: p.taxes,
      },
      ...(opts.addons ?? []),
    ];
    const computed = lines.map((l) => ({ ...l, t: computeLine({ ...l, taxes: taxInputs(l.taxes) }) }));
    const totals = sumTotals(computed.map((c) => c.t));
    const months = p.billingPeriod === 'YEARLY' ? 12 : 1;
    return prisma.subscription.create({
      data: {
        number: opts.state === 'DRAFT' ? null : await nextNumber(prisma, 'SUB', opts.start),
        customerId: opts.customerId,
        planId: p.id,
        paymentTermId: term(opts.termName).id,
        salespersonId: staff.id,
        state: opts.state,
        quantity: opts.quantity,
        startDate: opts.start,
        expiryDate: opts.expiry ?? addMonths(opts.start, 12),
        quotationValidUntil: ['DRAFT', 'QUOTATION'].includes(opts.state) ? addDays(today, 30) : null,
        nextInvoiceDate: opts.state === 'ACTIVE' ? nextPeriodStart(opts.start, months) : null,
        pausedAt: opts.state === 'PAUSED' ? addDays(today, -5) : null,
        closedAt: opts.state === 'CLOSED' ? addDays(today, -10) : null,
        closeReason: opts.closeReason,
        amountUntaxed: totals.untaxed,
        amountTax: totals.tax,
        amountTotal: totals.total,
        lines: {
          create: computed.map((c) => ({
            variantId: c.variantId,
            isPlanLine: c.isPlanLine,
            description: c.description,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            amountUntaxed: c.t.untaxed,
            amountTax: c.t.tax,
            amountTotal: c.t.total,
            taxes: { connect: c.taxes.map((t) => ({ id: t.id })) },
          })),
        },
      },
      include: { lines: { include: { taxes: true } }, customer: true, paymentTerm: true, plan: true },
    });
  }

  /** First period start after today, stepping from the subscription start */
  function nextPeriodStart(start: Date, months: number) {
    let d = start;
    while (d <= today) d = addMonths(d, months);
    return d;
  }

  async function invoice(
    sub: Awaited<ReturnType<typeof subscription>>,
    periodStart: Date,
    payments: { amount?: string; method: string; daysAfter: number }[] = [],
  ) {
    const months = sub.plan.billingPeriod === 'YEARLY' ? 12 : 1;
    const totals = { untaxed: D(sub.amountUntaxed), tax: D(sub.amountTax), total: D(sub.amountTotal) };
    const paid = payments.reduce((s, p) => s.plus(p.amount ?? totals.total), D(0));
    const due = totals.total.minus(paid);
    const c = sub.customer;
    await prisma.invoice.create({
      data: {
        number: await nextNumber(prisma, 'INV', periodStart),
        subscriptionId: sub.id,
        customerId: c.id,
        state: due.isZero() ? 'PAID' : 'CONFIRMED',
        periodStart,
        periodEnd: addDays(addMonths(periodStart, months), -1),
        invoiceDate: periodStart,
        dueDate: addDays(periodStart, sub.paymentTerm.dueDays),
        billingName: c.companyName ? `${c.companyName} (${c.name})` : c.name,
        billingEmail: c.email,
        billingAddress: [c.street, c.city, c.state, c.zip, c.country].filter(Boolean).join(', ') || null,
        amountUntaxed: totals.untaxed,
        amountTax: totals.tax,
        amountTotal: totals.total,
        amountPaid: paid,
        amountDue: due,
        confirmedAt: periodStart,
        sentAt: periodStart,
        lines: {
          create: sub.lines.map((l) => ({
            variantId: l.variantId,
            isPlanLine: l.isPlanLine,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amountUntaxed: l.amountUntaxed,
            amountTax: l.amountTax,
            amountTotal: l.amountTotal,
            taxes: { connect: l.taxes.map((t) => ({ id: t.id })) },
          })),
        },
        payments: {
          create: payments.map((p) => ({
            amount: p.amount ?? totals.total,
            methodId: method(p.method).id,
            date: addDays(periodStart, p.daysAfter),
            note: p.amount ? 'Part payment' : null,
            recordedById: staff.id,
          })),
        },
      },
    });
  }

  const asha = await customer('customer1@billcycle.local');
  const rahul = await customer('customer2@billcycle.local');
  const neha = await customer('customer3@billcycle.local');
  const kavya = await customer('kavya@raotech.in', {
    name: 'Kavya Rao',
    companyName: 'Rao Tech',
    city: 'Bengaluru',
  });
  const arjun = await customer('arjun@nairdesigns.in', {
    name: 'Arjun Nair',
    companyName: 'Nair Designs',
    city: 'Kochi',
  });
  const meera = await customer('meera@joshiclinic.in', {
    name: 'Meera Joshi',
    companyName: 'Joshi Clinic',
    city: 'Nagpur',
  });

  // Asha: monthly for 3 months: 2 paid, current month overdue (Net 15 passed only if we're past the 15th)
  const s1 = await subscription({
    customerId: asha.id,
    planName: 'Starter Monthly',
    quantity: 3,
    start: monthStart(-2),
    state: 'ACTIVE',
    termName: 'Net 15',
    addons: [addon(variant('Brightloop CRM', 'CRM-ODOO'), 1), addon(variant('Priority Support'), 1)],
  });
  await invoice(s1, monthStart(-2), [{ method: 'UPI', daysAfter: 3 }]);
  await invoice(s1, monthStart(-1), [{ method: 'Bank Transfer', daysAfter: 10 }]);
  await invoice(s1, monthStart(0));

  // Rahul: yearly business plan, 5 seats, partially paid and overdue
  const s2 = await subscription({
    customerId: rahul.id,
    planName: 'Business Yearly',
    quantity: 5,
    start: monthStart(-4),
    state: 'ACTIVE',
    termName: 'Net 30',
    addons: [addon(variant('Extra Storage 100GB'), 2)],
  });
  await invoice(s2, monthStart(-4), [{ amount: '30000.00', method: 'Cheque', daysAfter: 20 }]);

  // Rahul: second subscription, paused
  await subscription({
    customerId: rahul.id,
    planName: 'Starter Monthly',
    quantity: 1,
    start: monthStart(-1),
    state: 'PAUSED',
    termName: 'Immediate',
  });

  // Neha: started mid-month, invoice outstanding but not yet due
  const s3 = await subscription({
    customerId: neha.id,
    planName: 'Starter Monthly',
    quantity: 2,
    start: addDays(today, -10),
    state: 'ACTIVE',
    termName: 'Net 30',
    addons: [addon(variant('Brightloop HR'), 2)],
  });
  await invoice(s3, addDays(today, -10));

  // Pipeline: quotation, draft and a closed trial
  await subscription({
    customerId: kavya.id,
    planName: 'Business Yearly',
    quantity: 10,
    start: monthStart(1),
    state: 'QUOTATION',
    termName: 'Net 30',
    addons: [addon(variant('Brightloop CRM'), 10)],
  });
  await subscription({
    customerId: arjun.id,
    planName: 'Starter Monthly',
    quantity: 1,
    start: today,
    state: 'DRAFT',
    termName: 'Immediate',
  });
  await subscription({
    customerId: meera.id,
    planName: 'Weekly Trial',
    quantity: 1,
    start: addDays(today, -40),
    state: 'CLOSED',
    termName: 'Immediate',
    expiry: addDays(today, -12),
    closeReason: 'Trial ended',
  });

  console.log('  demo: 7 subscriptions (every state), 5 invoices (paid, partial, outstanding, overdue)');
}
