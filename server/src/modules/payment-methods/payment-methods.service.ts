import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound } from '../../lib/http-error';
import { paginated, toPrismaArgs } from '../../lib/pagination';
import type { PaymentMethodBody, PaymentMethodListQuery, PaymentMethodUpdate } from './payment-methods.schema';

const select = {
  id: true,
  name: true,
  isActive: true,
  createdAt: true,
  _count: { select: { payments: true } },
} satisfies Prisma.PaymentMethodSelect;

type Row = Prisma.PaymentMethodGetPayload<{ select: typeof select }>;

const toDto = ({ _count, ...m }: Row) => ({ ...m, usageCount: _count.payments });

async function assertNameFree(name: string, exceptId?: number) {
  const other = await prisma.paymentMethod.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (other) throw conflict('A payment method with this name already exists', 'DUPLICATE', { name: 'Already exists' });
}

export async function listPaymentMethods(p: PaymentMethodListQuery) {
  const where: Prisma.PaymentMethodWhereInput = {
    ...(p.q ? { name: { contains: p.q, mode: 'insensitive' } } : {}),
    ...(p.active !== undefined ? { isActive: p.active } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.paymentMethod.findMany({ where, ...toPrismaArgs(p, ['name', 'createdAt'], 'name'), select }),
    prisma.paymentMethod.count({ where }),
  ]);
  return paginated(rows.map(toDto), total, p);
}

export function paymentMethodOptions() {
  return prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}

export async function getPaymentMethod(id: number) {
  const method = await prisma.paymentMethod.findUnique({ where: { id }, select });
  if (!method) throw notFound('Payment method');
  return toDto(method);
}

export async function createPaymentMethod(data: PaymentMethodBody) {
  await assertNameFree(data.name);
  return toDto(await prisma.paymentMethod.create({ data, select }));
}

export async function updatePaymentMethod(id: number, data: PaymentMethodUpdate) {
  const existing = await prisma.paymentMethod.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Payment method');
  if (data.name) await assertNameFree(data.name, id);
  return toDto(await prisma.paymentMethod.update({ where: { id }, data, select }));
}

export async function deletePaymentMethod(id: number) {
  const method = await prisma.paymentMethod.findUnique({ where: { id }, select });
  if (!method) throw notFound('Payment method');
  if (method._count.payments) {
    throw conflict('Payments were recorded with this method. Deactivate it instead', 'IN_USE');
  }
  await prisma.paymentMethod.delete({ where: { id } });
}
