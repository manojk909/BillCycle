import { z } from 'zod';
import { zName } from '../../middleware/validate';

// "more than eight characters" (docs/07 A1): change here if mentors say >= 8
export const PASSWORD_MIN_LENGTH = 9;

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .email('Enter a valid email address');

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(PASSWORD_MIN_LENGTH, 'Password must be more than 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const signupSchema = z.object({
  name: zName('Name'),
  email: emailSchema,
  password: passwordSchema,
  companyName: z.string().trim().max(120).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is missing'),
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Enter your current password' })
      .min(1, 'Enter your current password'),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current one',
  });

export type SignupInput = z.infer<typeof signupSchema>;
