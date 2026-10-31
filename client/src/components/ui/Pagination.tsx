import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

type PaginationProps = {
  page: number
  limit: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, limit, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm text-gray-600">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
