import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/cn'

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  delay?: number
  className?: string
}

/** Text input that calls onChange after the user stops typing (default 300 ms). */
export function SearchInput({ value, onChange, placeholder = 'Search…', delay = 300, className }: SearchInputProps) {
  const [text, setText] = useState(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    setText(value)
  }, [value])

  useEffect(() => {
    if (text === value) return
    const id = setTimeout(() => onChangeRef.current(text), delay)
    return () => clearTimeout(id)
  }, [text, value, delay])

  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-gray-300 bg-white pr-3 pl-9 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none"
      />
    </div>
  )
}
