import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { Tx } from '../../lib/prisma';
import { conflict, notFound, unprocessable } from '../../lib/http-error';
import { paginated, toPrismaArgs } from '../../lib/pagination';
import { nextNumber } from '../../lib/sequence';
import { logActivity } from '../../lib/activity';
import { toDateOnly, addDays } from '../../lib/dates';
import { recomputeSubscription } from './subscriptions.totals';
import { getAllowedActions } from './subscription-actions';
import type { CreateBody, FromTemplateBody, ListQuery, UpdateBody } from './subscriptions.schema';

type Actor = { id?: number | null };

// ---- Fallback helpers until S2 `variantPrice` and S5 `isPlanAvailable` are merged ----

/** Variant price = product.salesPrice + Σ value.extraPrice. TODO(S2): swap for shared `variantPrice`. */
async function variantPrice(tx: Tx, variantId: number) {
  const variant = await tx.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { include: { taxes: true } }, values: true },
  });
  if (!variant) throw unprocessable('Unknown product variant', { 'lines': 'Unknown product variant' });
  if (!variant.isActive) throw unprocessable('That product variant is no longer available');
  const extras = variant.values.reduce((s, v) => s.plus(v.extraPrice), variant.product.salesPrice.minus(variant.product.salesPrice));
  const price = variant.product.salesPrice.plus(extras);
  return { price, taxIds: variant.product.taxes.map((t) => t.id), name: variant.product.name };
}

/** TODO(S5): replace with `isPlanAvailable(plan, date)`. */
function isPlanAvailable(
  plan: { startDate: Date | null; endDate: Date | null; isActive: boolean },
  on: Date,
): boolean {
  if (!plan.isActive) return false;
  const d = toDateOnly(on);
  if (plan.startDate && d < toDateOnly(plan.startDate)) return false;
  if (plan.endDate && d > toDateOnly(plan.endDate)) return false;
  return true;
}

// ---- Queries ----

const listWhere = (p: ListQuery): Prisma.SubscriptionWhereInput => ({
  ...(p.state ? { state: p.state } : {}),
  ...(p.planId ? { planId: p.planId } : {}),
  ...(p.customerId ? { customerId: p.customerId } : {}),
  ...(p.q
    ? {
        OR: [
          { number: { contains: p.q, mode: 'insensitive' } },
          { customer: { name: { contains: p.q, mode: 'insensitive' } } },
        ],
      }
    : {}),
});

export async function listSubscriptions(p: ListQuery) {
  const where = listWhere(p);
  const [rows, total] = await prisma.$transaction([
    prisma.subscription.findMany({
      where,
      ...toPrismaArgs(p, ['number', 'startDate', 'amountTotal', 'nextInvoiceDate', 'createdAt'], '-createdAt'),
      select: {
        id: true,
        number: true,
        state: true,
        startDate: true,
        expiryDate: true,
        nextInvoiceDate: true,
        amountTotal: true,
        customer: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ]);
  return paginated(rows, total, p);
}

export async function getSubscription(id: number) {
  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: {
      customer: true,
      plan: { include: { taxes: true } },
      paymentTerm: true,
      lines: { include: { taxes: true, variant: { include: { product: true } } }, orderBy: { id: 'asc' } },
      _count: { select: { invoices: true } },
    },
  });
  if (!sub) throw notFound('Subscription');
  return { ...sub, invoiceCount: sub._count.invoices, allowedActions: getAllowedActions(sub, sub.plan, 'ADMIN') };
}

export function getActivity(id: number) {
  return prisma.activityLog.findMany({
    where: { entityType: 'subscription', entityId: id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true } } },
  });
}

// ---- Mutations ----

async function buildLines(tx: Tx, body: { planId: number; quantity: number; lines: CreateBody['lines'] }) {
  const plan = await tx.recurringPlan.findUnique({ where: { id: body.planId }, include: { taxes: true } });
  if (!plan) throw unprocessable('Unknown plan', { planId: 'Unknown plan' });

  const created: Prisma.SubscriptionLineCreateWithoutSubscriptionInput[] = [
    {
      isPlanLine: true,
      description: `Plan: ${plan.name}`,
      quantity: body.quantity,
      unitPrice: plan.price,
      isActive: true,
      taxes: { connect: plan.taxes.map((t) => ({ id: t.id })) },
    },
  ];

  for (const line of body.lines) {
    const info = await variantPrice(tx, line.variantId);
    const taxIds = line.taxIds ?? info.taxIds;
    created.push({
      variant: { connect: { id: line.variantId } },
      isPlanLine: false,
      description: line.description ?? info.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice ?? info.price,
      isActive: true,
      taxes: { connect: taxIds.map((id) => ({ id })) },
    });
  }
  return { plan, lines: created };
}

export async function createSubscription(body: CreateBody, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: body.customerId }, select: { id: true } });
    if (!customer) throw unprocessable('Unknown customer', { customerId: 'Unknown customer' });
    await tx.paymentTerm.findUniqueOrThrow({ where: { id: body.paymentTermId } }).catch(() => {
      throw unprocessable('Unknown payment term', { paymentTermId: 'Unknown payment term' });
    });

    const { plan, lines } = await buildLines(tx, body);

    if (!isPlanAvailable(plan, body.startDate)) {
      throw unprocessable('This plan is not available on the start date', {
        planId: 'This plan is not available on the selected start date',
      });
    }
    if (body.quantity < plan.minQuantity) {
      throw unprocessable(`Minimum quantity for this plan is ${plan.minQuantity}`, {
        quantity: `Minimum quantity for this plan is ${plan.minQuantity}`,
      });
    }

    const number = await nextNumber(tx, 'SUB', body.startDate);
    const sub = await tx.subscription.create({
      data: {
        number,
        customerId: body.customerId,
        planId: body.planId,
        paymentTermId: body.paymentTermId,
        salespersonId: actor.id ?? null,
        state: 'DRAFT',
        quantity: body.quantity,
        startDate: toDateOnly(body.startDate),
        expiryDate: body.expiryDate ? toDateOnly(body.expiryDate) : null,
        lines: { create: lines },
      },
    });
    await recomputeSubscription(tx, sub.id);
    await logActivity(tx, {
      entityType: 'subscription',
      entityId: sub.id,
      action: 'create',
      message: `Subscription ${number} created`,
      userId: actor.id ?? null,
    });
    return getSubscriptionInTx(tx, sub.id);
  });
}

export async function createFromTemplate(body: FromTemplateBody, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const template = await tx.quotationTemplate.findUnique({
      where: { id: body.templateId },
      include: { plan: { include: { taxes: true } }, lines: true },
    });
    if (!template) throw unprocessable('Unknown template', { templateId: 'Unknown template' });

    const customer = await tx.customer.findUnique({ where: { id: body.customerId }, select: { id: true } });
    if (!customer) throw unprocessable('Unknown customer', { customerId: 'Unknown customer' });

    const quantity = Math.max(template.plan.minQuantity, 1);
    const lines: CreateBody['lines'] = template.lines.map((l) => ({
      variantId: l.variantId,
      quantity: l.quantity,
      description: l.description ?? undefined,
    }));
    const built = await buildLines(tx, { planId: template.planId, quantity, lines });

    const number = await nextNumber(tx, 'SUB', body.startDate);
    const sub = await tx.subscription.create({
      data: {
        number,
        customerId: body.customerId,
        planId: template.planId,
        templateId: template.id,
        paymentTermId: body.paymentTermId,
        salespersonId: actor.id ?? null,
        state: 'DRAFT',
        quantity,
        startDate: toDateOnly(body.startDate),
        quotationValidUntil: addDays(body.startDate, template.validityDays),
        lines: { create: built.lines },
      },
    });
    await recomputeSubscription(tx, sub.id);
    await logActivity(tx, {
      entityType: 'subscription',
      entityId: sub.id,
      action: 'create',
      message: `Subscription ${number} created from template "${template.name}"`,
      userId: actor.id ?? null,
    });
    return getSubscriptionInTx(tx, sub.id);
  });
}

export async function updateSubscription(id: number, body: UpdateBody, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({
      where: { id },
      include: { lines: true, plan: true },
    });
    if (!sub) throw notFound('Subscription');

    const editable = sub.state === 'DRAFT' || sub.state === 'QUOTATION';

    if (editable) {
      const quantity = body.quantity ?? sub.quantity;
      if (quantity < sub.plan.minQuantity) {
        throw unprocessable(`Minimum quantity for this plan is ${sub.plan.minQuantity}`, {
          quantity: `Minimum quantity for this plan is ${sub.plan.minQuantity}`,
        });
      }
      const startDate = body.startDate ? toDateOnly(body.startDate) : sub.startDate;
      const expiryDate =
        body.expiryDate === null ? null : body.expiryDate ? toDateOnly(body.expiryDate) : sub.expiryDate;
      if (expiryDate && expiryDate <= startDate) {
        throw unprocessable('Expiry date must be after the start date', {
          expiryDate: 'Expiry date must be after the start date',
        });
      }
      await tx.subscription.update({
        where: { id },
        data: {
          quantity,
          startDate,
          expiryDate,
          paymentTermId: body.paymentTermId ?? sub.paymentTermId,
        },
      });
      // Keep the plan line quantity in sync with the header quantity.
      const planLine = sub.lines.find((l) => l.isPlanLine);
      if (planLine && planLine.quantity !== quantity) {
        await tx.subscriptionLine.update({ where: { id: planLine.id }, data: { quantity } });
      }
      await applyLineEdits(tx, id, sub.lines, body.lines, true);
    } else if (sub.state === 'ACTIVE') {
      // Only toggling add-on isActive and adding new add-on lines (effective next period).
      await applyLineEdits(tx, id, sub.lines, body.lines, false);
    } else {
      throw conflict('This subscription can no longer be edited', 'INVALID_STATE');
    }

    await recomputeSubscription(tx, id);
    await logActivity(tx, {
      entityType: 'subscription',
      entityId: id,
      action: 'update',
      message: `Subscription ${sub.number ?? id} updated`,
      userId: actor.id ?? null,
    });
    return getSubscriptionInTx(tx, id);
  });
}

async function applyLineEdits(
  tx: Tx,
  subscriptionId: number,
  existing: { id: number; isPlanLine: boolean }[],
  lines: UpdateBody['lines'],
  fullEdit: boolean,
) {
  if (!lines) return;
  for (const line of lines) {
    if (line.id) {
      const current = existing.find((l) => l.id === line.id);
      if (!current || current.isPlanLine) continue; // never touch the plan line here
      const data: Prisma.SubscriptionLineUpdateInput = {};
      if (line.isActive !== undefined) data.isActive = line.isActive;
      if (fullEdit) {
        if (line.quantity !== undefined) data.quantity = line.quantity;
        if (line.unitPrice !== undefined) data.unitPrice = line.unitPrice;
        if (line.description !== undefined) data.description = line.description;
        if (line.taxIds) data.taxes = { set: line.taxIds.map((id) => ({ id })) };
      }
      await tx.subscriptionLine.update({ where: { id: line.id }, data });
    } else if (line.variantId) {
      const info = await variantPrice(tx, line.variantId);
      const taxIds = line.taxIds ?? info.taxIds;
      await tx.subscriptionLine.create({
        data: {
          subscriptionId,
          variantId: line.variantId,
          isPlanLine: false,
          description: line.description ?? info.name,
          quantity: line.quantity ?? 1,
          unitPrice: line.unitPrice ?? info.price,
          isActive: line.isActive ?? true,
          taxes: { connect: taxIds.map((id) => ({ id })) },
        },
      });
    }
  }
}

export async function deleteSubscription(id: number) {
  const sub = await prisma.subscription.findUnique({ where: { id }, select: { state: true } });
  if (!sub) throw notFound('Subscription');
  if (sub.state !== 'DRAFT') {
    throw conflict('Only draft subscriptions can be deleted', 'INVALID_STATE');
  }
  await prisma.subscription.delete({ where: { id } });
}

// Shared detail read inside a transaction (after a mutation).
async function getSubscriptionInTx(tx: Tx, id: number) {
  const sub = await tx.subscription.findUnique({
    where: { id },
    include: {
      customer: true,
      plan: { include: { taxes: true } },
      paymentTerm: true,
      lines: { include: { taxes: true, variant: { include: { product: true } } }, orderBy: { id: 'asc' } },
      _count: { select: { invoices: true } },
    },
  });
  if (!sub) throw notFound('Subscription');
  return { ...sub, invoiceCount: sub._count.invoices, allowedActions: getAllowedActions(sub, sub.plan, 'ADMIN') };
}
