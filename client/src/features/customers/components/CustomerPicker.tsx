import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useCustomerOptions, type CustomerOption } from '../api'

type CustomerPickerProps = {
  value: CustomerOption | null
  onChange: (customer: CustomerOption | null) => void
  invalid?: boolean
  disabled?: boolean
  id?: string
  placeholder?: string
}

/**
 * Searchable customer select backed by GET /api/customers/options.
 * Usage (subscription form): <CustomerPicker value={customer} onChange={(c) => setValue('customerId', c?.id)} />
 */
export function CustomerPicker({ value, onChange, invalid, disabled, id, placeholder = 'Search customers…' }: CustomerPickerProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const { data: options = [], isFetching } = useCustomerOptions(q)

  useEffect(() => {
    const t = setTimeout(() => setQ(text), 250)
    return () => clearTimeout(t)
  }, [text])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function pick(c: CustomerOption | null) {
    onChange(c)
    setText('')
    setOpen(false)
  }

  return (
    <div ref={box} className="relative">
      <div
        className={cn(
          'flex h-9 w-full items-center rounded-md border bg-white text-sm focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100',
          invalid ? 'border-danger-600' : 'border-gray-300',
          disabled && 'cursor-not-allowed bg-gray-100',
        )}
      >
        <input
          id={id}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          value={open ? text : (value?.name ?? '')}
          placeholder={value ? value.name : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className="h-full min-w-0 flex-1 rounded-md bg-transparent px-3 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed"
        />
        {value && !disabled ? (
          <button type="button" aria-label="Clear customer" onClick={() => pick(null)} className="px-2 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown className="mr-2 h-4 w-4 text-gray-400" />
        )}
      </div>
      {open && !disabled && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">{isFetching ? 'Searching…' : 'No customers found'}</li>
          )}
          {options.map((c) => (
            <li
              key={c.id}
              role="option"
              aria-selected={value?.id === c.id}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(c)
              }}
              className={cn('cursor-pointer px-3 py-2 text-sm hover:bg-primary-50', value?.id === c.id && 'bg-primary-50')}
            >
              <div className="font-medium text-gray-900">{c.name}</div>
              <div className="text-xs text-gray-500">{[c.companyName, c.email].filter(Boolean).join(' · ')}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
