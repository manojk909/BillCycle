import { z } from 'zod';
import { zName } from '../../middleware/validate';
import { paginationSchema } from '../../lib/pagination';
import { emailSchema, passwordSchema } from '../auth/auth.schema';

// Portal (customer) accounts come from self-signup; admins create staff only.
const staffRole = z.enum(['ADMIN', 'INTERNAL'], {
  errorMap: () => ({ message: 'Role must be Admin or Internal' }),
});

export const userListQuery = paginationSchema.extend({
  role: z.enum(['ADMIN', 'INTERNAL', 'PORTAL']).optional(),
});

export const createUserSchema = z.object({
  name: zName('Name'),
  email: emailSchema,
  role: staffRole.default('INTERNAL'),
  password: passwordSchema,
});

export const updateUserSchema = z
  .object({
    name: zName('Name'),
    role: staffRole,
    isActive: z.boolean(),
  })
  .partial();

export type UserListQuery = z.infer<typeof userListQuery>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
