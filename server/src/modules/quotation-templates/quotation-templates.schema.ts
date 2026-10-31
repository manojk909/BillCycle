import { z } from 'zod';
import { zId, zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';

/** '' clears the value (null); a missing key stays undefined so PATCH leaves it alone. */
const optionalText = (max: number, label: string) =>
  z
    .union([z.string().trim().max(max, `${label} is too long`), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));

const lineSchema = z.object({
  variantId: zId,
  quantity: z.coerce.number().int('Use a whole number').min(1, 'Quantity must be at least 1'),
  description: optionalText(200, 'Description'),
});

/** Flags a repeated variant on the row that repeats it, so the form shows it inline. */
const linesSchema = z
  .array(lineSchema)
  .max(50, 'Too many lines')
  .superRefine((lines, ctx) => {
    const seen = new Set<number>();
    lines.forEach((l, i) => {
      if (seen.has(l.variantId)) {
        ctx.addIssue({ code: 'custom', path: [i, 'variantId'], message: 'This product is already on another line' });
      }
      seen.add(l.variantId);
    });
  });

const fields = {
  name: zName('Name'),
  validityDays: z.coerce
    .number({ invalid_type_error: 'Enter the number of days' })
    .int('Use whole days')
    .min(1, 'Validity must be between 1 and 365 days')
    .max(365, 'Validity must be between 1 and 365 days'),
  planId: zId,
  notes: optionalText(1000, 'Notes'),
  lines: linesSchema,
};

// Empty lines are allowed: a template can be just the plan line (the UI warns instead of blocking).
export const templateBodySchema = z.object({ ...fields, lines: fields.lines.default([]) });

/** `lines`, when sent, replaces every line of the template. */
export const templateUpdateSchema = z.object(fields).partial();

export const templateListQuery = paginationSchema;

export type TemplateBody = z.infer<typeof templateBodySchema>;
export type TemplateUpdate = z.infer<typeof templateUpdateSchema>;
