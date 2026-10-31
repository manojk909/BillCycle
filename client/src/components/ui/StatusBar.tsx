import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export type StatusStep = { key: string; label: string }

/** Odoo-style lifecycle stepper. Steps before `current` are done, `current` is highlighted. */
export function StatusBar({ steps, current, className }: { steps: StatusStep[]; current: string; className?: string }) {
  const currentIndex = steps.findIndex((s) => s.key === current)
  return (
    <ol className={cn('flex flex-wrap items-center gap-1', className)} aria-label="Status">
      {steps.map((step, i) => {
        const done = currentIndex > -1 && i < currentIndex
        const active = i === currentIndex
        return (
          <li
            key={step.key}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
              active && 'bg-primary-600 text-white',
              done && 'bg-primary-50 text-primary-700',
              !active && !done && 'bg-gray-100 text-gray-500',
            )}
          >
            {done && <Check className="h-3 w-3" />}
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}
