import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const base =
  'w-full rounded-md border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors ' +
  'focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500'

const border = (invalid?: boolean) => (invalid ? 'border-danger-600' : 'border-gray-300')

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }

export function Input({ invalid, className, ref, ...rest }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(base, 'h-9', border(invalid), className)} {...rest} />
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

export function Textarea({ invalid, className, rows = 3, ref, ...rest }: TextareaProps & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={cn(base, 'py-2', border(invalid), className)} {...rest} />
}

export type SelectOption = { value: string | number; label: string }
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
  options: SelectOption[]
  placeholder?: string
}

export function Select({ invalid, className, options, placeholder, ref, ...rest }: SelectProps & { ref?: React.Ref<HTMLSelectElement> }) {
  return (
    <select ref={ref} aria-invalid={invalid || undefined} className={cn(base, 'h-9 pr-8', border(invalid), className)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: React.ReactNode }

export function Checkbox({ label, className, id, ref, ...rest }: CheckboxProps & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <label htmlFor={id} className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700', className)}>
      <input ref={ref} id={id} type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-primary-600" {...rest} />
      {label}
    </label>
  )
}

export type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  id?: string
}

export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <label htmlFor={id} className={cn('inline-flex items-center gap-2 text-sm text-gray-700', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:outline-none',
          checked ? 'bg-primary-600' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
      {label}
    </label>
  )
}
