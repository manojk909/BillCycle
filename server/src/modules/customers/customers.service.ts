import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound } from '../../lib/http-error';
import { paginated, toPrismaArgs, type Pagination } from '../../lib/pagination';
import { toFixed2 } from '../../lib/money';
import type { CustomerBody, CustomerUpdate } from './customers.schema';

const searchWhere = (q?: string): Prisma.CustomerWhereInput =>
  q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { companyName: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

export async function listCustomers(p: Pagination) {
  const where = searchWhere(p.q);
  const [rows, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      ...toPrismaArgs(p, ['name', 'email', 'companyName', 'createdAt'], 'name'),
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        city: true,
        createdAt: true,
        user: { select: { id: true } },
        _count: { select: { subscriptions: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);
  const data = rows.map(({ user, _count, ...c }) => ({
    ...c,
    hasPortalAccess: !!user,
    subscriptionCount: _count.subscriptions,
  }));
  return paginated(data, total, p);
}

/** Lightweight list for pickers (subscriptions, discounts). */
export function customerOptions(q?: string) {
  return prisma.customer.findMany({
    where: searchWhere(q),
    orderBy: { name: 'asc' },
    take: 20,
    select: { id: true, name: true, email: true, companyName: true },
  });
}

export async function getCustomer(id: number) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, isActive: true } } },
  });
  if (!customer) throw notFound('Customer');

  const [activeSubscriptions, openInvoices] = await prisma.$transaction([
    prisma.subscription.count({ where: { customerId: id, state: 'ACTIVE' } }),
    prisma.invoice.aggregate({
      where: { customerId: id, state: 'CONFIRMED' },
      _count: true,
      _sum: { amountDue: true },
    }),
  ]);
  const { user, ...rest } = customer;
  return {
    ...rest,
    portalUser: user,
    stats: {
      activeSubscriptions,
      openInvoices: openInvoices._count,
      outstandingAmount: toFixed2(openInvoices._sum.amountDue ?? 0),
    },
  };
}

async function assertEmailFree(email: string, exceptId?: number) {
  const other = await prisma.customer.findFirst({
    where: { email, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (other) {
    throw conflict('Another customer already uses this email', 'DUPLICATE', {
      email: 'Another customer already uses this email',
    });
  }
}

export async function createCustomer(data: CustomerBody) {
  await assertEmailFree(data.email);
  return prisma.customer.create({ data });
}

export async function updateCustomer(id: number, data: CustomerUpdate) {
  const existing = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Customer');
  if (data.email) await assertEmailFree(data.email, id);
  return prisma.customer.update({ where: { id }, data });
}

export async function deleteCustomer(id: number) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      user: { select: { id: true } },
      _count: { select: { subscriptions: true, invoices: true } },
    },
  });
  if (!customer) throw notFound('Customer');
  if (customer._count.subscriptions || customer._count.invoices) {
    throw conflict('This customer has subscriptions or invoices and cannot be deleted', 'IN_USE');
  }
  if (customer.user) {
    throw conflict('This customer has a portal login. Deactivate the user instead of deleting', 'IN_USE');
  }
  await prisma.customer.delete({ where: { id } });
}
