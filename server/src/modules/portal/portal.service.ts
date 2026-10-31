import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { notFound } from '../../lib/http-error';
import { paginated, toPrismaArgs, type Pagination } from '../../lib/pagination';
import { toFixed2 } from '../../lib/money';
import { today } from '../../lib/dates';
import { paymentStatus } from '../payments/payment-status';
import type { ProfileInput } from './portal.schema';

// Every query here is scoped to the logged-in customer's id. A record from another customer is
// simply "not found" (404), so the portal never confirms that it exists.

// Customers see their own subscriptions once they are offered (drafts stay internal).
const visibleSubscriptions = (customerId: number): Prisma.SubscriptionWhereInput => ({
  customerId,
  state: { not: 'DRAFT' },
});
// Draft and cancelled invoices are internal.
const visibleInvoices = (customerId: number): Prisma.InvoiceWhereInput => ({
  customerId,
  state: { in: ['CONFIRMED', 'PAID'] },
});

export async function summary(customerId: number) {
  const t = today();
  const [active, open, overdue, next] = await prisma.$transaction([
    prisma.subscription.count({ where: { customerId, state: 'ACTIVE' } }),
    prisma.invoice.aggregate({
      where: { customerId, state: 'CONFIRMED', amountDue: { gt: 0 } },
      _sum: { amountDue: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { customerId, state: 'CONFIRMED', amountDue: { gt: 0 }, dueDate: { lt: t } },
      _sum: { amountDue: true },
      _count: true,
    }),
    prisma.subscription.findFirst({
      where: { customerId, state: 'ACTIVE', nextInvoiceDate: { not: null } },
      orderBy: { nextInvoiceDate: 'asc' },
      select: { nextInvoiceDate: true },
    }),
  ]);
  return {
    activeSubscriptions: active,
    openInvoices: open._count,
    amountDue: toFixed2(open._sum.amountDue ?? 0),
    overdueInvoices: overdue._count,
    overdueAmount: toFixed2(overdue._sum.amountDue ?? 0),
    nextInvoiceDate: next?.nextInvoiceDate ?? null,
  };
}

export async function listSubscriptions(customerId: number, p: Pagination) {
  const where = visibleSubscriptions(customerId);
  const [rows, total] = await prisma.$transaction([
    prisma.subscription.findMany({
      where,
      ...toPrismaArgs(p, ['startDate', 'createdAt'], '-startDate'),
      select: {
        id: true,
        number: true,
        state: true,
        quantity: true,
        startDate: true,
        expiryDate: true,
        nextInvoiceDate: true,
        amountTotal: true,
        plan: { select: { name: true, billingPeriod: true, billingInterval: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ]);
  return paginated(rows, total, p);
}

export async function getSubscription(customerId: number, id: number) {
  const sub = await prisma.subscription.findFirst({
    where: { id, ...visibleSubscriptions(customerId) },
    select: {
      id: true,
      number: true,
      state: true,
      quantity: true,
      startDate: true,
      expiryDate: true,
      quotationValidUntil: true,
      nextInvoiceDate: true,
      closedAt: true,
      closeReason: true,
      amountUntaxed: true,
      amountTax: true,
      amountTotal: true,
      paymentTerm: { select: { name: true } },
      plan: {
        select: {
          name: true,
          billingPeriod: true,
          billingInterval: true,
          pausable: true,
          closable: true,
          renewable: true,
        },
      },
      lines: {
        orderBy: [{ isPlanLine: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          description: true,
          isPlanLine: true,
          isActive: true,
          quantity: true,
          unitPrice: true,
          amountUntaxed: true,
          amountTax: true,
          amountTotal: true,
          taxes: { select: { name: true } },
        },
      },
      invoices: {
        where: { state: { in: ['CONFIRMED', 'PAID'] } },
        orderBy: { invoiceDate: 'desc' },
        take: 12,
        select: {
          id: true,
          number: true,
          invoiceDate: true,
          dueDate: true,
          state: true,
          amountTotal: true,
          amountDue: true,
          amountPaid: true,
        },
      },
    },
  });
  if (!sub) throw notFound('Subscription');
  const t = today();
  return { ...sub, invoices: sub.invoices.map((i) => ({ ...i, status: paymentStatus(i, t) })) };
}

export async function listInvoices(customerId: number, p: Pagination) {
  const where = visibleInvoices(customerId);
  const [rows, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      ...toPrismaArgs(p, ['invoiceDate', 'dueDate', 'amountTotal'], '-invoiceDate'),
      select: {
        id: true,
        number: true,
        state: true,
        invoiceDate: true,
        dueDate: true,
        periodStart: true,
        periodEnd: true,
        amountTotal: true,
        amountPaid: true,
        amountDue: true,
        subscription: { select: { number: true, plan: { select: { name: true } } } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);
  const t = today();
  return paginated(
    rows.map((i) => ({ ...i, status: paymentStatus(i, t) })),
    total,
    p,
  );
}

export async function getInvoice(customerId: number, id: number) {
  const inv = await prisma.invoice.findFirst({
    where: { id, ...visibleInvoices(customerId) },
    include: {
      lines: {
        orderBy: [{ isPlanLine: 'desc' }, { id: 'asc' }],
        include: { taxes: { select: { name: true } } },
      },
      payments: {
        orderBy: { date: 'asc' },
        select: { id: true, amount: true, date: true, method: { select: { name: true } } },
      },
      subscription: {
        select: { number: true, paymentTerm: { select: { name: true } }, plan: { select: { name: true } } },
      },
    },
  });
  if (!inv) throw notFound('Invoice');
  return { ...inv, status: paymentStatus(inv, today()) };
}

export async function getProfile(customerId: number, userId: number) {
  const [customer, user] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
  ]);
  if (!customer || !user) throw notFound('Profile');
  return { ...customer, name: user.name, loginEmail: user.email };
}

export async function updateProfile(customerId: number, userId: number, input: ProfileInput) {
  await prisma.$transaction([
    prisma.customer.update({ where: { id: customerId }, data: input }),
    ...(input.name ? [prisma.user.update({ where: { id: userId }, data: { name: input.name } })] : []),
  ]);
  return getProfile(customerId, userId);
}
