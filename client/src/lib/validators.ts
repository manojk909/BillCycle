import { z } from 'zod'

// Must match the server rules (docs/04-business-rules.md §1): more than 8 characters.
export const PASSWORD_MIN_LENGTH = 9

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address, e.g. name@company.com')

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'Password must be more than 8 characters')
  .regex(/[A-Z]/, 'Password needs at least one uppercase letter')
  .regex(/[a-z]/, 'Password needs at least one lowercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password needs at least one special character')

export function passwordChecks(password: string) {
  return [
    { label: 'More than 8 characters', ok: password.length >= PASSWORD_MIN_LENGTH },
    { label: 'An uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'A lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'A special character (e.g. @ # !)', ok: /[^A-Za-z0-9]/.test(password) },
  ]
}
