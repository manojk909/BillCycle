import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './api'

/** Puts API validation errors (`error.fields`) under the matching form fields. Returns true if any were applied. */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): boolean {
  if (!(error instanceof ApiError) || !error.fields) return false
  const entries = Object.entries(error.fields)
  for (const [field, message] of entries) {
    setError(field as Path<T>, { type: 'server', message })
  }
  return entries.length > 0
}
