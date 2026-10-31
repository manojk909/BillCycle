import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound, unprocessable } from '../../lib/http-error';
import { paginated, toPrismaArgs } from '../../lib/pagination';
import { D, toFixed2 } from '../../lib/money';
import { toDateOnly, toISODate } from '../../lib/dates';
import type { PlanBody, PlanListQuery, PlanOptionsQuery, PlanUpdate } from './plans.schema';

export { assertPlanAllows, isPlanAvailable, type PlanAction } from './plans.rules';

const taxSelect = { id: true, name: true, type: true, rate: true } satisfies Prisma.TaxSelect;

const select = {
  id: true,
  name: true,
  price: true,
  billingPeriod: true,
  billingInterval: true,
  minQuantity: true,
  startDate: true,
  endDate: true,
  autoClose: true,
  closable: true,
  pausable: true,
  renewable: true,
  isActive: true,
  createdAt: true,
  taxes: { select: taxSelect, orderBy: { name: 'asc' } },
  _count: { select: { subscriptions: { where: { state: 'ACTIVE' } } } },
} satisfies Prisma.RecurringPlanSelect;

type Row = Prisma.RecurringPlanGetPayload<{ select: typeof select }>;

const toDto = ({ _count, price, startDate, endDate, taxes, ...p }: Row) => ({
  ...p,
  price: toFixed2(price),
  startDate: startDate ? toISODate(startDate) : null,
  endDate: endDate ? toISODate(endDate) : null,
  taxes: taxes.map((t) => ({ ...t, rate: D(t.rate).toString() })),
  taxIds: taxes.map((t) => t.id),
  activeSubscriptions: _count.subscriptions,
});

/** start <= date <= end, with null bounds open (same rule as isPlanAvailable, in SQL). */
const availableOnWhere = (date: Date): Prisma.RecurringPlanWhereInput => {
  const day = toDateOnly(date);
  return {
    isActive: true,
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: day } }] },
      { OR: [{ endDate: null }, { endDate: { gte: day } }] },
    ],
  };
};

async function assertTaxesExist(taxIds: number[]) {
  if (!taxIds.length) return;
  const found = await prisma.tax.count({ where: { id: { in: taxIds } } });
  if (found !== new Set(taxIds).size) {
    throw unprocessable('Please fix the highlighted fields', { taxIds: 'One or more taxes no longer exist' });
  }
}

export async function listPlans(p: PlanListQuery) {
  const where: Prisma.RecurringPlanWhereInput = {
    ...(p.q ? { name: { contains: p.q, mode: 'insensitive' } } : {}),
    ...(p.billingPeriod ? { billingPeriod: p.billingPeriod } : {}),
    ...(p.active !== undefined ? { isActive: p.active } : {}),
    ...(p.availableOn ? availableOnWhere(p.availableOn) : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.recurringPlan.findMany({ where, ...toPrismaArgs(p, ['name', 'price', 'createdAt'], 'name'), select }),
    prisma.recurringPlan.count({ where }),
  ]);
  return paginated(rows.map(toDto), total, p);
}

/** Active plans for pickers (subscription and template forms). Pass availableOn to hide expired / future plans. */
export async function planOptions({ availableOn, q }: PlanOptionsQuery) {
  const rows = await prisma.recurringPlan.findMany({
    where: {
      isActive: true,
      ...(availableOn ? availableOnWhere(availableOn) : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    orderBy: { name: 'asc' },
    take: 50,
    select: {
      id: true,
      name: true,
      price: true,
      billingPeriod: true,
      billingInterval: true,
      minQuantity: true,
      taxes: { select: taxSelect },
    },
  });
  return rows.map(({ price, taxes, ...p }) => ({
    ...p,
    price: toFixed2(price),
    taxes: taxes.map((t) => ({ ...t, rate: D(t.rate).toString() })),
    taxIds: taxes.map((t) => t.id),
  }));
}

export async function getPlan(id: number) {
  const plan = await prisma.recurringPlan.findUnique({ where: { id }, select });
  if (!plan) throw notFound('Plan');
  return toDto(plan);
}

export async function createPlan({ taxIds, ...data }: PlanBody) {
  await assertTaxesExist(taxIds);
  const plan = await prisma.recurringPlan.create({
    data: { ...data, taxes: { connect: taxIds.map((id) => ({ id })) } },
    select,
  });
  return toDto(plan);
}

// minQuantity changes only apply to new subscriptions; existing ones keep their quantity.
export async function updatePlan(id: number, { taxIds, ...data }: PlanUpdate) {
  const existing = await prisma.recurringPlan.findUnique({
    where: { id },
    select: { startDate: true, endDate: true },
  });
  if (!existing) throw notFound('Plan');
  const start = data.startDate !== undefined ? data.startDate : existing.startDate;
  const end = data.endDate !== undefined ? data.endDate : existing.endDate;
  if (start && end && end < start) {
    throw unprocessable('Please fix the highlighted fields', {
      endDate: 'End date must be on or after the start date',
    });
  }
  if (taxIds) await assertTaxesExist(taxIds);
  const plan = await prisma.recurringPlan.update({
    where: { id },
    data: { ...data, ...(taxIds ? { taxes: { set: taxIds.map((t) => ({ id: t })) } } : {}) },
    select,
  });
  return toDto(plan);
}

export async function deletePlan(id: number) {
  const plan = await prisma.recurringPlan.findUnique({
    where: { id },
    select: { id: true, _count: { select: { subscriptions: true, templates: true } } },
  });
  if (!plan) throw notFound('Plan');
  if (plan._count.subscriptions || plan._count.templates) {
    throw conflict('This plan is used by subscriptions or quotation templates. Archive it instead', 'IN_USE');
  }
  await prisma.recurringPlan.delete({ where: { id } });
}
