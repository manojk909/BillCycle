import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)} {...rest} />
}

export function CardHeader({ title, actions, className }: { title: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3', className)}>
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {actions}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...rest} />
}
