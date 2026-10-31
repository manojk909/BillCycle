import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { generateInvoiceForPeriod } from './invoice-generator';
import { toFixed2 } from '../../lib/money';
import { toDateOnly } from '../../lib/dates';

// SK4 integration test. Builds a throwaway ACTIVE subscription with a plan line
// (18% GST) + one active add-on + one INACTIVE add-on, then bills a period twice.
// Requires the dev database (docker compose up + migrate + seed).

let subId: number;
let customerId: number;
let planId: number;
let termId: number;
let gstId: number;
const periodStart = toDateOnly(new Date(Date.UTC(2099, 0, 1))); // far-future, collision-free

beforeAll(async () => {
  const gst =
    (await prisma.tax.findFirst({ where: { type: 'PERCENT', rate: 18 } })) ??
    (await prisma.tax.create({ data: { name: 'SK4 GST 18', type: 'PERCENT', rate: 18 } }));
  gstId = gst.id;

  const customer = await prisma.customer.create({
    data: { name: 'SK4 Test Co', email: `sk4-${Date.now()}@test.local`, country: 'India', city: 'Pune' },
  });
  customerId = customer.id;

  const plan = await prisma.recurringPlan.create({
    data: { name: 'SK4 Monthly', price: '1000.00', billingPeriod: 'MONTHLY', billingInterval: 1 },
  });
  planId = plan.id;

  const term = await prisma.paymentTerm.findFirstOrThrow();
  termId = term.id;

  const sub = await prisma.subscription.create({
    data: {
      customerId,
      planId,
      paymentTermId: termId,
      state: 'ACTIVE',
      quantity: 1,
      startDate: periodStart,
      nextInvoiceDate: periodStart,
      lines: {
        create: [
          {
            isPlanLine: true,
            description: 'Plan: SK4 Monthly',
            quantity: 1,
            unitPrice: '1000.00',
            isActive: true,
            taxes: { connect: [{ id: gstId }] },
          },
          {
            isPlanLine: false,
            description: 'Active add-on',
            quantity: 2,
            unitPrice: '100.00',
            isActive: true,
            taxes: { connect: [{ id: gstId }] },
          },
          {
            isPlanLine: false,
            description: 'Inactive add-on (should not be billed)',
            quantity: 5,
            unitPrice: '999.00',
            isActive: false,
          },
        ],
      },
    },
  });
  subId = sub.id;
});

afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { subscriptionId: subId } });
  await prisma.subscription.deleteMany({ where: { id: subId } });
  await prisma.recurringPlan.deleteMany({ where: { id: planId } });
  await prisma.customer.deleteMany({ where: { id: customerId } });
  await prisma.$disconnect();
});

describe('generateInvoiceForPeriod (SK4)', () => {
  it('creates an invoice with correct totals (18% GST), excluding inactive add-ons', async () => {
    const result = await prisma.$transaction((tx) => generateInvoiceForPeriod(tx, subId, periodStart));
    expect(result.status).toBe('created');
    expect(result.invoiceId).toBeDefined();

    const inv = await prisma.invoice.findUniqueOrThrow({
      where: { id: result.invoiceId! },
      include: { lines: true },
    });
    // Untaxed = 1000 + 200 = 1200; tax = 216; total = 1416. Inactive add-on excluded.
    expect(toFixed2(inv.amountUntaxed)).toBe('1200.00');
    expect(toFixed2(inv.amountTax)).toBe('216.00');
    expect(toFixed2(inv.amountTotal)).toBe('1416.00');
    expect(toFixed2(inv.amountDue)).toBe('1416.00');
    expect(toFixed2(inv.amountPaid)).toBe('0.00');
    expect(inv.state).toBe('DRAFT');
    expect(inv.number).toBeNull(); // number assigned on confirm (SK6), not generation
    expect(inv.lines).toHaveLength(2); // plan line + active add-on only
  });

  it('advances nextInvoiceDate to periodEnd + 1 day', async () => {
    const sub = await prisma.subscription.findUniqueOrThrow({ where: { id: subId } });
    // MONTHLY period 2099-01-01 .. 2099-01-31, next = 2099-02-01
    expect(sub.nextInvoiceDate?.toISOString().slice(0, 10)).toBe('2099-02-01');
  });

  it('is idempotent: second call for the same period is skipped, DB has one invoice', async () => {
    const again = await prisma.$transaction((tx) => generateInvoiceForPeriod(tx, subId, periodStart));
    expect(again.status).toBe('skipped');
    const count = await prisma.invoice.count({ where: { subscriptionId: subId, periodStart } });
    expect(count).toBe(1);
  });

  it('does not generate for a paused subscription', async () => {
    await prisma.subscription.update({ where: { id: subId }, data: { state: 'PAUSED' } });
    const paused = await prisma.$transaction((tx) =>
      generateInvoiceForPeriod(tx, subId, toDateOnly(new Date(Date.UTC(2099, 5, 1)))),
    );
    expect(paused.status).toBe('skipped');
    await prisma.subscription.update({ where: { id: subId }, data: { state: 'ACTIVE' } });
  });
});
