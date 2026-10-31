import type { DiscountScope, DiscountType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound, unprocessable, type FieldErrors } from '../../lib/http-error';
import { paginated, toPrismaArgs } from '../../lib/pagination';
import { D, toFixed2 } from '../../lib/money';
import { today, toISODate } from '../../lib/dates';
import { discountStatus, type DiscountStatus } from './discounts.status';
import type { DiscountBody, DiscountListQuery, DiscountUpdate } from './discounts.schema';

export { discountStatus, type DiscountStatus } from './discounts.status';

const select = {
  id: true,
  name: true,
  code: true,
  type: true,
  value: true,
  scope: true,
  minPurchaseAmount: true,
  minQuantity: true,
  startDate: true,
  endDate: true,
  usageLimit: true,
  timesUsed: true,
  isActive: true,
  createdAt: true,
  products: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
  customers: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.DiscountRuleSelect;

type Row = Prisma.DiscountRuleGetPayload<{ select: typeof select }>;

function toDto(r: Row) {
  return {
    ...r,
    value: toFixed2(r.value),
    minPurchaseAmount: r.minPurchaseAmount === null ? null : toFixed2(r.minPurchaseAmount),
    startDate: toISODate(r.startDate),
    endDate: toISODate(r.endDate),
    productIds: r.products.map((p) => p.id),
    customerIds: r.customers.map((c) => c.id),
    status: discountStatus(r, today()),
  };
}

type RuleShape = {
  type: DiscountType;
  value: string;
  scope: DiscountScope;
  productIds: number[];
  startDate: Date;
  endDate: Date;
  usageLimit: number | null;
  timesUsed: number;
};

/** Cross-field rules, checked on create and on PATCH against the merged rule. */
function assertRuleValid(r: RuleShape) {
  const fields: FieldErrors = {};
  const value = D(r.value);
  if (r.type === 'PERCENT' && value.greaterThan(100)) fields.value = 'A percentage must be between 0 and 100';
  if (r.type === 'FIXED' && value.lessThanOrEqualTo(0)) fields.value = 'A fixed discount must be more than 0';
  if (r.endDate < r.startDate) fields.endDate = 'End date must be on or after the start date';
  if (r.scope === 'PRODUCTS' && r.productIds.length === 0) fields.productIds = 'Pick at least one product';
  if (r.usageLimit !== null && r.usageLimit < r.timesUsed) {
    fields.usageLimit = `It has already been used ${r.timesUsed} times`;
  }
  if (Object.keys(fields).length) throw unprocessable('Please fix the highlighted fields', fields);
}

async function assertRefsExist(productIds: number[], customerIds: number[]) {
  const [products, customers] = await prisma.$transaction([
    prisma.product.count({ where: { id: { in: productIds } } }),
    prisma.customer.count({ where: { id: { in: customerIds } } }),
  ]);
  const fields: FieldErrors = {};
  if (products !== new Set(productIds).size) fields.productIds = 'One or more products no longer exist';
  if (customers !== new Set(customerIds).size) fields.customerIds = 'One or more customers no longer exist';
  if (Object.keys(fields).length) throw unprocessable('Please fix the highlighted fields', fields);
}

async function assertCodeFree(code: string | null | undefined, exceptId?: number) {
  if (!code) return;
  const other = await prisma.discountRule.findFirst({
    where: { code, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (other) throw conflict('Another discount already uses this code', 'DUPLICATE', { code: 'Already exists' });
}

/** SQL mirror of discountStatus(), same precedence: inactive > exhausted > expired > scheduled > active. */
function statusWhere(status: DiscountStatus): Prisma.DiscountRuleWhereInput {
  const day = today();
  const limit = prisma.discountRule.fields.usageLimit;
  const exhausted: Prisma.DiscountRuleWhereInput = { usageLimit: { not: null }, timesUsed: { gte: limit } };
  const notExhausted: Prisma.DiscountRuleWhereInput = { OR: [{ usageLimit: null }, { timesUsed: { lt: limit } }] };
  switch (status) {
    case 'inactive':
      return { isActive: false };
    case 'exhausted':
      return { isActive: true, ...exhausted };
    case 'expired':
      return { isActive: true, endDate: { lt: day }, AND: [notExhausted] };
    case 'scheduled':
      return { isActive: true, startDate: { gt: day }, endDate: { gte: day }, AND: [notExhausted] };
    case 'active':
      return { isActive: true, startDate: { lte: day }, endDate: { gte: day }, AND: [notExhausted] };
  }
}

export async function listDiscounts(p: DiscountListQuery) {
  const where: Prisma.DiscountRuleWhereInput = {
    ...(p.q
      ? {
          OR: [
            { name: { contains: p.q, mode: 'insensitive' } },
            { code: { contains: p.q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(p.scope ? { scope: p.scope } : {}),
    ...(p.status ? statusWhere(p.status) : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.discountRule.findMany({ where, ...toPrismaArgs(p, ['name', 'startDate', 'endDate', 'createdAt']), select }),
    prisma.discountRule.count({ where }),
  ]);
  return paginated(rows.map(toDto), total, p);
}

export async function getDiscount(id: number) {
  const rule = await prisma.discountRule.findUnique({
    where: { id },
    select: {
      ...select,
      usages: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          invoice: { select: { id: true, number: true, state: true } },
          subscription: { select: { id: true, number: true } },
        },
      },
    },
  });
  if (!rule) throw notFound('Discount');
  const { usages, ...row } = rule;
  return { ...toDto(row), usages: usages.map((u) => ({ ...u, amount: toFixed2(u.amount) })) };
}

export async function createDiscount({ productIds, customerIds, ...data }: DiscountBody) {
  const usageLimit = data.usageLimit ?? null;
  assertRuleValid({ ...data, productIds, usageLimit, timesUsed: 0 });
  await assertRefsExist(productIds, customerIds);
  await assertCodeFree(data.code);
  const rule = await prisma.discountRule.create({
    data: {
      ...data,
      usageLimit,
      // Product links only matter for PRODUCTS scope; drop them otherwise so the rule reads clearly.
      products: { connect: (data.scope === 'PRODUCTS' ? productIds : []).map((id) => ({ id })) },
      customers: { connect: customerIds.map((id) => ({ id })) },
    },
    select: { id: true },
  });
  return getDiscount(rule.id);
}

export async function updateDiscount(id: number, { productIds, customerIds, ...data }: DiscountUpdate) {
  const existing = await prisma.discountRule.findUnique({ where: { id }, select });
  if (!existing) throw notFound('Discount');
  const merged = {
    type: data.type ?? existing.type,
    value: data.value ?? existing.value.toString(),
    scope: data.scope ?? existing.scope,
    productIds: productIds ?? existing.products.map((p) => p.id),
    startDate: data.startDate ?? existing.startDate,
    endDate: data.endDate ?? existing.endDate,
    usageLimit: data.usageLimit !== undefined ? data.usageLimit : existing.usageLimit,
    timesUsed: existing.timesUsed,
  };
  assertRuleValid(merged);
  await assertRefsExist(productIds ?? [], customerIds ?? []);
  await assertCodeFree(data.code, id);
  const keepProducts = merged.scope === 'PRODUCTS' ? merged.productIds : [];
  await prisma.discountRule.update({
    where: { id },
    data: {
      ...data,
      ...(productIds || data.scope ? { products: { set: keepProducts.map((p) => ({ id: p })) } } : {}),
      ...(customerIds ? { customers: { set: customerIds.map((c) => ({ id: c })) } } : {}),
    },
  });
  return getDiscount(id);
}

export async function deactivateDiscount(id: number) {
  const existing = await prisma.discountRule.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Discount');
  await prisma.discountRule.update({ where: { id }, data: { isActive: false } });
  return getDiscount(id);
}
