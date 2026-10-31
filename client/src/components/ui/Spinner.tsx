import { cn } from '@/lib/cn'

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dims = { sm: 'h-3.5 w-3.5 border-2', md: 'h-5 w-5 border-2', lg: 'h-8 w-8 border-[3px]' }[size]
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block animate-spin rounded-full border-current border-r-transparent text-primary-600', dims, className)}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex h-full min-h-48 items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
