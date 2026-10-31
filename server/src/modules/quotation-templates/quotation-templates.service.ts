import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { notFound, unprocessable, type FieldErrors } from '../../lib/http-error';
import { paginated, toPrismaArgs, type Pagination } from '../../lib/pagination';
import { toFixed2 } from '../../lib/money';
import { variantLabel, variantPrice } from '../products/products.service';
import type { TemplateBody, TemplateUpdate } from './quotation-templates.schema';

const planSelect = {
  id: true,
  name: true,
  price: true,
  billingPeriod: true,
  billingInterval: true,
  minQuantity: true,
  isActive: true,
} satisfies Prisma.RecurringPlanSelect;

type PlanRow = Prisma.RecurringPlanGetPayload<{ select: typeof planSelect }>;

const planDto = ({ price, ...p }: PlanRow) => ({ ...p, price: toFixed2(price) });

const lineSelect = {
  id: true,
  quantity: true,
  description: true,
  variant: {
    select: {
      id: true,
      isActive: true,
      values: { select: { name: true, extraPrice: true, attribute: { select: { name: true } } } },
      product: { select: { id: true, name: true, salesPrice: true, isActive: true, taxes: { select: { id: true } } } },
    },
  },
} satisfies Prisma.QuotationTemplateLineSelect;

type LineRow = Prisma.QuotationTemplateLineGetPayload<{ select: typeof lineSelect }>;

// Same shape as GET /products/variants/options, so the form can hand it straight to VariantPicker.
const lineDto = ({ variant, ...l }: LineRow) => ({
  ...l,
  variantId: variant.id,
  label: variantLabel(variant.product, variant.values),
  price: toFixed2(variantPrice(variant.product, variant.values)),
  productId: variant.product.id,
  taxIds: variant.product.taxes.map((t) => t.id),
  available: variant.isActive && variant.product.isActive,
});

async function assertPlanActive(planId: number) {
  const plan = await prisma.recurringPlan.findUnique({ where: { id: planId }, select: { isActive: true } });
  if (!plan) throw unprocessable('Please fix the highlighted fields', { planId: 'This plan no longer exists' });
  if (!plan.isActive) throw unprocessable('Please fix the highlighted fields', { planId: 'This plan is archived' });
}

/** Every line must point at an active variant of an active product; errors land on the offending row. */
async function assertVariantsActive(lines: { variantId: number }[]) {
  if (!lines.length) return;
  const found = await prisma.productVariant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    select: { id: true, isActive: true, product: { select: { isActive: true } } },
  });
  const ok = new Set(found.filter((v) => v.isActive && v.product.isActive).map((v) => v.id));
  const fields: FieldErrors = {};
  lines.forEach((l, i) => {
    if (!ok.has(l.variantId)) fields[`lines.${i}.variantId`] = 'This product is archived or no longer exists';
  });
  if (Object.keys(fields).length) throw unprocessable('Please fix the highlighted fields', fields);
}

export async function listTemplates(p: Pagination) {
  const where: Prisma.QuotationTemplateWhereInput = p.q
    ? {
        OR: [
          { name: { contains: p.q, mode: 'insensitive' } },
          { plan: { name: { contains: p.q, mode: 'insensitive' } } },
        ],
      }
    : {};
  const [rows, total] = await prisma.$transaction([
    prisma.quotationTemplate.findMany({
      where,
      ...toPrismaArgs(p, ['name', 'validityDays', 'createdAt'], 'name'),
      select: {
        id: true,
        name: true,
        validityDays: true,
        notes: true,
        createdAt: true,
        plan: { select: planSelect },
        _count: { select: { lines: true, subscriptions: true } },
      },
    }),
    prisma.quotationTemplate.count({ where }),
  ]);
  const data = rows.map(({ plan, _count, ...t }) => ({
    ...t,
    plan: planDto(plan),
    lineCount: _count.lines,
    subscriptionCount: _count.subscriptions,
  }));
  return paginated(data, total, p);
}

/** For the subscription form's "start from template" picker. */
export function templateOptions() {
  return prisma.quotationTemplate.findMany({
    where: { plan: { isActive: true } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, validityDays: true, planId: true, plan: { select: { name: true } } },
  });
}

export async function getTemplate(id: number) {
  const template = await prisma.quotationTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      validityDays: true,
      notes: true,
      createdAt: true,
      plan: { select: planSelect },
      lines: { select: lineSelect, orderBy: { id: 'asc' } },
    },
  });
  if (!template) throw notFound('Quotation template');
  const { plan, lines, ...t } = template;
  return { ...t, planId: plan.id, plan: planDto(plan), lines: lines.map(lineDto) };
}

export async function createTemplate({ lines, ...data }: TemplateBody) {
  await assertPlanActive(data.planId);
  await assertVariantsActive(lines);
  const template = await prisma.quotationTemplate.create({
    data: { ...data, lines: { create: lines } },
    select: { id: true },
  });
  return getTemplate(template.id);
}

export async function updateTemplate(id: number, { lines, ...data }: TemplateUpdate) {
  const existing = await prisma.quotationTemplate.findUnique({ where: { id }, select: { planId: true } });
  if (!existing) throw notFound('Quotation template');
  // Only re-check the plan when it changes, so editing a template whose plan was later archived still works.
  if (data.planId && data.planId !== existing.planId) await assertPlanActive(data.planId);
  if (lines) await assertVariantsActive(lines);
  await prisma.$transaction(async (tx) => {
    await tx.quotationTemplate.update({ where: { id }, data });
    if (lines) {
      await tx.quotationTemplateLine.deleteMany({ where: { templateId: id } });
      await tx.quotationTemplateLine.createMany({ data: lines.map((l) => ({ ...l, templateId: id })) });
    }
  });
  return getTemplate(id);
}

/** Subscriptions made from the template keep their own lines; only the back-link is cleared. */
export async function deleteTemplate(id: number) {
  const existing = await prisma.quotationTemplate.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Quotation template');
  await prisma.$transaction([
    prisma.subscription.updateMany({ where: { templateId: id }, data: { templateId: null } }),
    prisma.quotationTemplate.delete({ where: { id } }),
  ]);
}
