import { z } from 'zod';
import { zId, zMoney, zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';

const valueSchema = z.object({
  id: zId.optional(), // present = update that value, missing = create a new one
  name: zName('Value name', 60),
  extraPrice: zMoney.default('0'),
});

/** Flags repeated value names (case-insensitive) on the row that repeats, so the form shows it inline. */
const uniqueValueNames = (values: { name: string }[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  values.forEach((v, i) => {
    const key = v.name.toLowerCase();
    if (seen.has(key)) ctx.addIssue({ code: 'custom', path: [i, 'name'], message: 'This value is already in the list' });
    seen.add(key);
  });
};

const valuesSchema = z
  .array(valueSchema)
  .min(1, 'Add at least one value')
  .max(50, 'Too many values')
  .superRefine(uniqueValueNames);

export const attributeBodySchema = z.object({
  name: zName('Name', 60),
  values: valuesSchema,
});

/** `values` is the full desired list: stored values left out of it are removed. */
export const attributeUpdateSchema = z.object({
  name: zName('Name', 60).optional(),
  values: valuesSchema.optional(),
});

export const attributeListQuery = paginationSchema;

export type AttributeBody = z.infer<typeof attributeBodySchema>;
export type AttributeUpdate = z.infer<typeof attributeUpdateSchema>;
