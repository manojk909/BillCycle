import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound, unprocessable } from '../../lib/http-error';
import { paginated, toPrismaArgs, type Pagination } from '../../lib/pagination';
import { toFixed2 } from '../../lib/money';
import type { AttributeBody, AttributeUpdate } from './attributes.schema';

const select = {
  id: true,
  name: true,
  createdAt: true,
  values: {
    orderBy: { id: 'asc' },
    select: { id: true, name: true, extraPrice: true, _count: { select: { variants: true } } },
  },
} satisfies Prisma.ProductAttributeSelect;

type Row = Prisma.ProductAttributeGetPayload<{ select: typeof select }>;

const toDto = ({ values, ...a }: Row) => ({
  ...a,
  values: values.map(({ _count, extraPrice, ...v }) => ({
    ...v,
    extraPrice: toFixed2(extraPrice),
    variantCount: _count.variants,
  })),
});

async function assertNameFree(name: string, exceptId?: number) {
  const other = await prisma.productAttribute.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (other) throw conflict('An attribute with this name already exists', 'DUPLICATE', { name: 'Already exists' });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export async function listAttributes(p: Pagination) {
  const where: Prisma.ProductAttributeWhereInput = p.q
    ? {
        OR: [
          { name: { contains: p.q, mode: 'insensitive' } },
          { values: { some: { name: { contains: p.q, mode: 'insensitive' } } } },
        ],
      }
    : {};
  const [rows, total] = await prisma.$transaction([
    prisma.productAttribute.findMany({ where, ...toPrismaArgs(p, ['name', 'createdAt'], 'name'), select }),
    prisma.productAttribute.count({ where }),
  ]);
  return paginated(rows.map(toDto), total, p);
}

/** Every attribute with its values, for the variant editor (S2/S3). */
export async function attributeOptions() {
  const rows = await prisma.productAttribute.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, values: { orderBy: { id: 'asc' }, select: { id: true, name: true, extraPrice: true } } },
  });
  return rows.map((a) => ({ ...a, values: a.values.map((v) => ({ ...v, extraPrice: toFixed2(v.extraPrice) })) }));
}

export async function getAttribute(id: number) {
  const attribute = await prisma.productAttribute.findUnique({ where: { id }, select });
  if (!attribute) throw notFound('Attribute');
  return toDto(attribute);
}

export async function createAttribute({ name, values }: AttributeBody) {
  await assertNameFree(name);
  const attribute = await prisma.productAttribute.create({
    data: { name, values: { create: values.map((v) => ({ name: v.name, extraPrice: v.extraPrice })) } },
    select,
  });
  return toDto(attribute);
}

export async function updateAttribute(id: number, { name, values }: AttributeUpdate) {
  const existing = await prisma.productAttribute.findUnique({ where: { id }, select });
  if (!existing) throw notFound('Attribute');
  if (name) await assertNameFree(name, id);

  await prisma.$transaction(async (tx) => {
    if (name) await tx.productAttribute.update({ where: { id }, data: { name } });
    if (!values) return;

    const stored = new Map(existing.values.map((v) => [v.id, v]));
    const badIndex = values.findIndex((v) => v.id !== undefined && !stored.has(v.id));
    if (badIndex >= 0) {
      throw unprocessable('Please fix the highlighted fields', {
        [`values.${badIndex}.name`]: 'This value belongs to another attribute',
      });
    }

    const keepIds = new Set(values.flatMap((v) => (v.id ? [v.id] : [])));
    const removed = existing.values.filter((v) => !keepIds.has(v.id));
    const used = removed.filter((v) => v._count.variants > 0);
    if (used.length) {
      const names = used.map((v) => `${v.name} (${plural(v._count.variants, 'variant')})`).join(', ');
      throw conflict(`Can't remove values that product variants use: ${names}`, 'IN_USE');
    }

    // Delete first so a new row may reuse the name of a value removed in the same request.
    if (removed.length) await tx.attributeValue.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });
    for (const v of values) {
      if (v.id) await tx.attributeValue.update({ where: { id: v.id }, data: { name: v.name, extraPrice: v.extraPrice } });
      else await tx.attributeValue.create({ data: { attributeId: id, name: v.name, extraPrice: v.extraPrice } });
    }
  });

  return getAttribute(id);
}

export async function deleteAttribute(id: number) {
  const attribute = await prisma.productAttribute.findUnique({ where: { id }, select });
  if (!attribute) throw notFound('Attribute');
  const variants = attribute.values.reduce((n, v) => n + v._count.variants, 0);
  if (variants) {
    throw conflict(`This attribute is used by ${plural(variants, 'product variant')} and cannot be deleted`, 'IN_USE');
  }
  await prisma.productAttribute.delete({ where: { id } });
}
