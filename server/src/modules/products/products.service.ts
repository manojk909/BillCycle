import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound, unprocessable } from '../../lib/http-error';
import { paginated, toPrismaArgs } from '../../lib/pagination';
import { D, toFixed2 } from '../../lib/money';
import { variantLabel, variantPrice } from './products.pricing';
import type { ProductBody, ProductListQuery, ProductUpdate, VariantBody } from './products.schema';

export { variantLabel, variantPrice } from './products.pricing';

/** Cost price is admin-only; every read passes this so INTERNAL responses never include it. */
export type Viewer = { canSeeCost: boolean };

const taxSelect = { id: true, name: true, type: true, rate: true } satisfies Prisma.TaxSelect;

const valueSelect = {
  id: true,
  name: true,
  extraPrice: true,
  attribute: { select: { id: true, name: true } },
} satisfies Prisma.AttributeValueSelect;

const variantSelect = {
  id: true,
  sku: true,
  isDefault: true,
  isActive: true,
  values: { select: valueSelect },
  _count: { select: { subscriptionLines: true, templateLines: true, invoiceLines: true } },
} satisfies Prisma.ProductVariantSelect;

const productSelect = {
  id: true,
  name: true,
  type: true,
  salesPrice: true,
  costPrice: true,
  notes: true,
  isActive: true,
  createdAt: true,
  taxes: { select: taxSelect, orderBy: { name: 'asc' } },
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;
type VariantRow = Prisma.ProductVariantGetPayload<{ select: typeof variantSelect }>;

const usage = (v: VariantRow) => v._count.subscriptionLines + v._count.templateLines + v._count.invoiceLines;

function productDto({ salesPrice, costPrice, taxes, ...p }: ProductRow, viewer: Viewer) {
  return {
    ...p,
    salesPrice: toFixed2(salesPrice),
    ...(viewer.canSeeCost ? { costPrice: toFixed2(costPrice) } : {}),
    taxes: taxes.map((t) => ({ ...t, rate: D(t.rate).toString() })),
    taxIds: taxes.map((t) => t.id),
  };
}

function variantDto(product: { name: string; salesPrice: Prisma.Decimal }, v: VariantRow) {
  const { values } = v;
  return {
    id: v.id,
    sku: v.sku,
    isDefault: v.isDefault,
    isActive: v.isActive,
    label: variantLabel(product, values),
    price: toFixed2(variantPrice(product, values)),
    values: values.map((x) => ({
      id: x.id,
      name: x.name,
      extraPrice: toFixed2(x.extraPrice),
      attributeId: x.attribute.id,
      attributeName: x.attribute.name,
    })),
    usageCount: usage(v),
  };
}

const costWarning = (p: { salesPrice: Prisma.Decimal; costPrice: Prisma.Decimal }) =>
  p.costPrice.greaterThan(p.salesPrice) ? 'Cost price is higher than the sales price' : undefined;

async function assertTaxesExist(taxIds: number[]) {
  if (!taxIds.length) return;
  const found = await prisma.tax.count({ where: { id: { in: taxIds } } });
  if (found !== new Set(taxIds).size) {
    throw unprocessable('Please fix the highlighted fields', { taxIds: 'One or more taxes no longer exist' });
  }
}

export async function listProducts(p: ProductListQuery, viewer: Viewer) {
  const where: Prisma.ProductWhereInput = {
    ...(p.q ? { name: { contains: p.q, mode: 'insensitive' } } : {}),
    ...(p.type ? { type: p.type } : {}),
    ...(p.isActive !== undefined ? { isActive: p.isActive } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      ...toPrismaArgs(p, ['name', 'salesPrice', 'createdAt'], 'name'),
      select: { ...productSelect, _count: { select: { variants: true } } },
    }),
    prisma.product.count({ where }),
  ]);
  const data = rows.map(({ _count, ...row }) => ({ ...productDto(row, viewer), variantCount: _count.variants }));
  return paginated(data, total, p);
}

export async function getProduct(id: number, viewer: Viewer) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { ...productSelect, variants: { select: variantSelect, orderBy: [{ isDefault: 'desc' }, { id: 'asc' }] } },
  });
  if (!product) throw notFound('Product');
  const { variants, ...row } = product;
  return { ...productDto(row, viewer), variants: variants.map((v) => variantDto(row, v)) };
}

/** Creates the product with its default variant (no attribute values), which plain lines point at. */
export async function createProduct({ taxIds, ...data }: ProductBody, viewer: Viewer) {
  await assertTaxesExist(taxIds);
  const product = await prisma.product.create({
    data: {
      ...data,
      taxes: { connect: taxIds.map((id) => ({ id })) },
      variants: { create: { isDefault: true } },
    },
    select: { id: true, salesPrice: true, costPrice: true },
  });
  return { ...(await getProduct(product.id, viewer)), warning: costWarning(product) };
}

export async function updateProduct(id: number, { taxIds, ...data }: ProductUpdate, viewer: Viewer) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Product');
  if (taxIds) await assertTaxesExist(taxIds);
  const product = await prisma.product.update({
    where: { id },
    data: { ...data, ...(taxIds ? { taxes: { set: taxIds.map((t) => ({ id: t })) } } : {}) },
    select: { salesPrice: true, costPrice: true },
  });
  return { ...(await getProduct(id, viewer)), warning: costWarning(product) };
}

export async function setProductActive(id: number, isActive: boolean, viewer: Viewer) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Product');
  await prisma.product.update({ where: { id }, data: { isActive } });
  return getProduct(id, viewer);
}

/** Hard delete only while no line references any of its variants; otherwise archive. */
export async function deleteProduct(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, variants: { select: variantSelect } },
  });
  if (!product) throw notFound('Product');
  if (product.variants.some((v) => usage(v) > 0)) {
    throw conflict('This product is used on subscriptions, templates or invoices. Archive it instead', 'IN_USE');
  }
  await prisma.product.delete({ where: { id } });
}

const comboKey = (ids: number[]) => [...ids].sort((a, b) => a - b).join(',');

export async function addVariant(productId: number, { valueIds, sku }: VariantBody, viewer: Viewer) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, variants: { select: { values: { select: { id: true } } } } },
  });
  if (!product) throw notFound('Product');

  const ids = [...new Set(valueIds)];
  const values = await prisma.attributeValue.findMany({
    where: { id: { in: ids } },
    select: { id: true, attributeId: true },
  });
  if (values.length !== ids.length) {
    throw unprocessable('Please fix the highlighted fields', { valueIds: 'One or more values no longer exist' });
  }
  if (new Set(values.map((v) => v.attributeId)).size !== values.length) {
    throw unprocessable('Please fix the highlighted fields', { valueIds: 'Pick at most one value per attribute' });
  }

  const key = comboKey(ids);
  if (product.variants.some((v) => comboKey(v.values.map((x) => x.id)) === key)) {
    throw conflict('This product already has a variant with these values', 'DUPLICATE', {
      valueIds: 'This combination already exists',
    });
  }
  if (sku && (await prisma.productVariant.findUnique({ where: { sku }, select: { id: true } }))) {
    throw conflict('Another variant already uses this SKU', 'DUPLICATE', { sku: 'Already exists' });
  }

  await prisma.productVariant.create({
    data: { productId, sku, values: { connect: ids.map((id) => ({ id })) } },
  });
  return getProduct(productId, viewer);
}

export async function deleteVariant(productId: number, variantId: number) {
  const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId }, select: variantSelect });
  if (!variant) throw notFound('Variant');
  if (variant.isDefault) throw conflict("The default variant can't be deleted", 'IN_USE');
  if (usage(variant) > 0) {
    throw conflict('This variant is used on subscriptions, templates or invoices and cannot be deleted', 'IN_USE');
  }
  await prisma.productVariant.delete({ where: { id: variantId } });
}

/** Active variants of active products for line pickers (subscriptions SK1, templates S6). */
export async function variantOptions(q?: string) {
  const rows = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      product: { isActive: true },
      ...(q
        ? {
            OR: [
              { product: { name: { contains: q, mode: 'insensitive' } } },
              { values: { some: { name: { contains: q, mode: 'insensitive' } } } },
              { sku: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ product: { name: 'asc' } }, { isDefault: 'desc' }, { id: 'asc' }],
    take: 50,
    select: {
      id: true,
      values: { select: valueSelect },
      product: { select: { id: true, name: true, salesPrice: true, taxes: { select: { id: true } } } },
    },
  });
  return rows.map((v) => ({
    variantId: v.id,
    label: variantLabel(v.product, v.values),
    price: toFixed2(variantPrice(v.product, v.values)),
    productId: v.product.id,
    taxIds: v.product.taxes.map((t) => t.id),
  }));
}
