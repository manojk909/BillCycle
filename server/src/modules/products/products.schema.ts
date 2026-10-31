import { z } from 'zod';
import { ProductType } from '@prisma/client';
import { zId, zMoney, zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';
import { zActiveFilter } from '../taxes/taxes.schema';

/** '' clears the value (null); a missing key stays undefined so PATCH leaves it alone. */
const optionalText = (max: number, label: string) =>
  z
    .union([z.string().trim().max(max, `${label} is too long`), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));

const fields = {
  name: zName('Name'),
  type: z.nativeEnum(ProductType, { errorMap: () => ({ message: 'Choose Service or Goods' }) }),
  salesPrice: zMoney,
  costPrice: zMoney,
  notes: optionalText(1000, 'Notes'),
  taxIds: z.array(zId).max(10, 'Too many taxes'),
};

export const productBodySchema = z.object({
  ...fields,
  type: fields.type.default('SERVICE'),
  costPrice: fields.costPrice.default('0'),
  taxIds: fields.taxIds.default([]),
});

export const productUpdateSchema = z.object(fields).partial();

export const productListQuery = paginationSchema.extend({
  type: z.nativeEnum(ProductType).optional(),
  isActive: zActiveFilter,
});

export const variantBodySchema = z.object({
  valueIds: z.array(zId).max(10, 'Too many values').default([]),
  sku: optionalText(40, 'SKU'),
});

export const variantParams = z.object({ id: zId, variantId: zId });

export const variantOptionsQuery = z.object({ q: z.string().trim().optional() });

export type ProductBody = z.infer<typeof productBodySchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuery>;
export type VariantBody = z.infer<typeof variantBodySchema>;
