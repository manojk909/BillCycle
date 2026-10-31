import type { Prisma, TaxType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound, unprocessable } from '../../lib/http-error';
import { paginated, toPrismaArgs } from '../../lib/pagination';
import { D } from '../../lib/money';
import type { TaxBody, TaxListQuery, TaxUpdate } from './taxes.schema';

const select = {
  id: true,
  name: true,
  type: true,
  rate: true,
  isActive: true,
  createdAt: true,
  _count: { select: { products: true, plans: true, subscriptionLines: true, invoiceLines: true } },
} satisfies Prisma.TaxSelect;

type Row = Prisma.TaxGetPayload<{ select: typeof select }>;

const toDto = ({ _count, rate, ...t }: Row) => ({
  ...t,
  rate: D(rate).toString(),
  usageCount: _count.products + _count.plans + _count.subscriptionLines + _count.invoiceLines,
});

function assertRate(type: TaxType, rate: string) {
  if (type === 'PERCENT' && D(rate).greaterThan(100)) {
    throw unprocessable('Please fix the highlighted fields', { rate: 'A percentage tax must be between 0 and 100' });
  }
}

async function assertNameFree(name: string, exceptId?: number) {
  const other = await prisma.tax.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (other) throw conflict('A tax with this name already exists', 'DUPLICATE', { name: 'Already exists' });
}

export async function listTaxes(p: TaxListQuery) {
  const where: Prisma.TaxWhereInput = {
    ...(p.q ? { name: { contains: p.q, mode: 'insensitive' } } : {}),
    ...(p.active !== undefined ? { isActive: p.active } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.tax.findMany({ where, ...toPrismaArgs(p, ['name', 'rate', 'createdAt'], 'name'), select }),
    prisma.tax.count({ where }),
  ]);
  return paginated(rows.map(toDto), total, p);
}

/** Active taxes for selects (products, plans, subscription lines). */
export async function taxOptions() {
  const rows = await prisma.tax.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, type: true, rate: true },
  });
  return rows.map((t) => ({ ...t, rate: D(t.rate).toString() }));
}

export async function getTax(id: number) {
  const tax = await prisma.tax.findUnique({ where: { id }, select });
  if (!tax) throw notFound('Tax');
  return toDto(tax);
}

export async function createTax(data: TaxBody) {
  assertRate(data.type, data.rate);
  await assertNameFree(data.name);
  return toDto(await prisma.tax.create({ data, select }));
}

export async function updateTax(id: number, data: TaxUpdate) {
  const existing = await prisma.tax.findUnique({ where: { id }, select: { type: true, rate: true } });
  if (!existing) throw notFound('Tax');
  assertRate(data.type ?? existing.type, data.rate ?? existing.rate.toString());
  if (data.name) await assertNameFree(data.name, id);
  return toDto(await prisma.tax.update({ where: { id }, data, select }));
}

export async function deleteTax(id: number) {
  const tax = await prisma.tax.findUnique({ where: { id }, select });
  if (!tax) throw notFound('Tax');
  if (toDto(tax).usageCount > 0) {
    throw conflict('This tax is used by products, plans or invoices. Deactivate it instead', 'IN_USE');
  }
  await prisma.tax.delete({ where: { id } });
}
