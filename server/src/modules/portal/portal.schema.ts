import { z } from 'zod';
import { zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';

const optional = (schema: z.ZodString) =>
  z
    .union([schema, z.literal('')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));

export const portalListQuery = paginationSchema;

export const profileSchema = z.object({
  name: zName('Name').optional(),
  phone: optional(
    z
      .string()
      .trim()
      .regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number'),
  ),
  companyName: optional(z.string().trim().max(120, 'Company name is too long')),
  street: optional(z.string().trim().max(200)),
  city: optional(z.string().trim().max(80)),
  state: optional(z.string().trim().max(80)),
  zip: optional(
    z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9 -]{3,10}$/, 'Enter a valid PIN / ZIP code'),
  ),
  country: optional(z.string().trim().max(80)),
});

export type ProfileInput = z.infer<typeof profileSchema>;
