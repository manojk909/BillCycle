import type { RequestHandler } from 'express';
import { z, type ZodError, type ZodTypeAny } from 'zod';
import { HttpError, type FieldErrors } from '../lib/http-error';

type Schemas = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };

export function toFieldErrors(error: ZodError, fallbackKey = 'form'): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || fallbackKey;
    fields[key] ??= issue.message;
  }
  return fields;
}

/**
 * Validates and replaces req.params / req.query / req.body with the parsed values.
 * On failure: 422 { error: { code: "VALIDATION_ERROR", message, fields: { "lines.0.quantity": "..." } } }
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    let fields: FieldErrors = {};
    const parsed: Record<string, unknown> = {};
    for (const key of ['params', 'query', 'body'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key] ?? {});
      if (result.success) parsed[key] = result.data;
      else fields = { ...fields, ...toFieldErrors(result.error, key) };
    }
    if (Object.keys(fields).length) {
      return next(new HttpError(422, 'VALIDATION_ERROR', 'Please fix the highlighted fields', fields));
    }
    if ('body' in parsed) req.body = parsed.body;
    if ('params' in parsed) Object.assign(req.params, parsed.params);
    // Express 5 exposes req.query as a getter, so redefine it
    if ('query' in parsed) Object.defineProperty(req, 'query', { value: parsed.query, writable: true });
    next();
  };

// Reusable field schemas
export const zId = z.coerce.number().int().positive();
export const idParams = z.object({ id: zId });
export const zDate = z.coerce.date({ errorMap: () => ({ message: 'Enter a valid date' }) });
export const zMoney = z
  .union([z.number(), z.string().trim().min(1, 'Amount is required')])
  .transform((v) => String(v))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter a valid amount (up to 2 decimals)');
export const zName = (label = 'Name', max = 120) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max);
