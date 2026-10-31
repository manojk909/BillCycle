import { cn } from '@/lib/cn'

export type TabItem = { key: string; label: string; count?: number }

export function Tabs({ tabs, value, onChange, className }: { tabs: TabItem[]; value: string; onChange: (key: string) => void; className?: string }) {
  return (
    <div className={cn('mb-4 overflow-x-auto border-b border-gray-200', className)}>
      <div role="tablist" className="flex gap-1">
        {tabs.map((tab) => {
          const active = tab.key === value
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.key)}
              className={cn(
                '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn('rounded-full px-1.5 text-xs', active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600')}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
