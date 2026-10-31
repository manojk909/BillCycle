import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useProducts } from '@/features/products/api'

type Item = { id: number; name: string }

type Props = { value: Item[]; onChange: (items: Item[]) => void; invalid?: boolean; disabled?: boolean; id?: string }

/** Search active products and collect them as chips (discount rules with PRODUCTS scope). */
export function ProductMultiSelect({ value, onChange, invalid, disabled, id }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const { data, isFetching } = useProducts({ page: 1, limit: 20, q: q || undefined, isActive: true })
  const options = (data?.data ?? []).filter((p) => !value.some((v) => v.id === p.id))

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

  return (
    <div ref={box} className="relative">
      <div
        className={cn(
          'flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border bg-white px-2 py-1 text-sm focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100',
          invalid ? 'border-danger-600' : 'border-gray-300',
          disabled && 'cursor-not-allowed bg-gray-100',
        )}
      >
        {value.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
            {p.name}
            {!disabled && (
              <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(value.filter((v) => v.id !== p.id))}>
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          id={id}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          value={text}
          placeholder={value.length ? '' : 'Search products…'}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className="h-7 min-w-24 flex-1 bg-transparent px-1 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      {open && !disabled && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {options.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">{isFetching ? 'Searching…' : 'No more products'}</li>}
          {options.map((p) => (
            <li
              key={p.id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault()
                onChange([...value, { id: p.id, name: p.name }])
                setText('')
              }}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-primary-50"
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
