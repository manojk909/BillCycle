import type { Prisma } from '@prisma/client';
import { D, round2, sum, type DecimalLike } from '../../lib/money';

// Pure pricing helpers, free of Prisma so they are cheap to unit test. Re-exported from products.service.ts.

/** Variant price = product sales price + the extra price of each chosen attribute value. */
export function variantPrice(
  product: { salesPrice: DecimalLike },
  values: { extraPrice: DecimalLike }[] = [],
): Prisma.Decimal {
  return round2(D(product.salesPrice).plus(sum(values.map((v) => v.extraPrice))));
}

type LabelValue = { name: string; attribute: { name: string } };

/** "Brightloop CRM (Brand: Odoo, Seats: 10)"; just the product name for the default variant. */
export function variantLabel(product: { name: string }, values: LabelValue[] = []): string {
  if (!values.length) return product.name;
  const parts = [...values]
    .sort((a, b) => a.attribute.name.localeCompare(b.attribute.name))
    .map((v) => `${v.attribute.name}: ${v.name}`);
  return `${product.name} (${parts.join(', ')})`;
}
