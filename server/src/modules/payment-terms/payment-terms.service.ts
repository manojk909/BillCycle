import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound } from '../../lib/http-error';
import { paginated, toPrismaArgs, type Pagination } from '../../lib/pagination';
import type { PaymentTermBody, PaymentTermUpdate } from './payment-terms.schema';

const select = {
  id: true,
  name: true,
  dueDays: true,
  createdAt: true,
  _count: { select: { subscriptions: true } },
} satisfies Prisma.PaymentTermSelect;

type Row = Prisma.PaymentTermGetPayload<{ select: typeof select }>;

const toDto = ({ _count, ...t }: Row) => ({ ...t, usageCount: _count.subscriptions });

async function assertNameFree(name: string, exceptId?: number) {
  const other = await prisma.paymentTerm.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (other) throw conflict('A payment term with this name already exists', 'DUPLICATE', { name: 'Already exists' });
}

export async function listPaymentTerms(p: Pagination) {
  const where: Prisma.PaymentTermWhereInput = p.q ? { name: { contains: p.q, mode: 'insensitive' } } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.paymentTerm.findMany({ where, ...toPrismaArgs(p, ['name', 'dueDays', 'createdAt'], 'dueDays'), select }),
    prisma.paymentTerm.count({ where }),
  ]);
  return paginated(rows.map(toDto), total, p);
}

/** Payment terms have no active flag, so every term is selectable. */
export function paymentTermOptions() {
  return prisma.paymentTerm.findMany({ orderBy: { dueDays: 'asc' }, select: { id: true, name: true, dueDays: true } });
}

export async function getPaymentTerm(id: number) {
  const term = await prisma.paymentTerm.findUnique({ where: { id }, select });
  if (!term) throw notFound('Payment term');
  return toDto(term);
}

export async function createPaymentTerm(data: PaymentTermBody) {
  await assertNameFree(data.name);
  return toDto(await prisma.paymentTerm.create({ data, select }));
}

export async function updatePaymentTerm(id: number, data: PaymentTermUpdate) {
  const existing = await prisma.paymentTerm.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Payment term');
  if (data.name) await assertNameFree(data.name, id);
  return toDto(await prisma.paymentTerm.update({ where: { id }, data, select }));
}

export async function deletePaymentTerm(id: number) {
  const term = await prisma.paymentTerm.findUnique({ where: { id }, select });
  if (!term) throw notFound('Payment term');
  if (term._count.subscriptions) {
    throw conflict('This payment term is used by subscriptions and cannot be deleted', 'IN_USE');
  }
  await prisma.paymentTerm.delete({ where: { id } });
}
