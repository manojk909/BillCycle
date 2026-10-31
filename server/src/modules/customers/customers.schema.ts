import { z } from 'zod';
import { zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';

/** Optional text field: '' clears the value (null); a missing key stays undefined so PATCH leaves it alone. */
const optional = (schema: z.ZodString) =>
  z
    .union([schema, z.literal('')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));

export const customerBodySchema = z.object({
  name: zName('Name'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
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
  taxId: optional(
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN'),
  ),
});

export const customerUpdateSchema = customerBodySchema.partial();

export const customerListQuery = paginationSchema;

export const customerOptionsQuery = z.object({ q: z.string().trim().optional() });

export type CustomerBody = z.infer<typeof customerBodySchema>;
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;
