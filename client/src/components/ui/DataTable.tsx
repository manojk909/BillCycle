import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { EmptyState } from './EmptyState'

export type Column<T> = {
  key: string
  header: ReactNode
  render?: (row: T) => ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey?: (row: T) => string | number
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyTitle?: ReactNode
  emptyDescription?: ReactNode
  emptyAction?: ReactNode
  className?: string
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' }

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-gray-200 bg-white', className)}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-gray-600 uppercase',
                  alignClass[col.align ?? 'left'],
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-gray-100" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading &&
            rows.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && 'cursor-pointer hover:bg-primary-50/50')}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-2.5 text-sm whitespace-nowrap text-gray-800', alignClass[col.align ?? 'left'], col.className)}
                  >
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />}
    </div>
  )
}
