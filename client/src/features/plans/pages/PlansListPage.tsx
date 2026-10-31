import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, Checkbox, DataTable, PageHeader, Pagination, SearchInput, Tabs, type Column } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney, formatPeriod, toDateInput } from '@/lib/format'
import { usePlans, type BillingPeriod, type Plan } from '../api'

const LIMIT = 20

const TABS = [
  { key: '', label: 'All' },
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'YEARLY', label: 'Yearly' },
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'DAILY', label: 'Daily' },
]

function availabilityLabel(p: Pick<Plan, 'startDate' | 'endDate'>) {
  if (p.startDate && p.endDate) return `${formatDate(p.startDate)} – ${formatDate(p.endDate)}`
  if (p.startDate) return `From ${formatDate(p.startDate)}`
  if (p.endDate) return `Until ${formatDate(p.endDate)}`
  return 'Always'
}

const OPTION_BADGES: { key: 'autoClose' | 'closable' | 'pausable' | 'renewable'; label: string }[] = [
  { key: 'autoClose', label: 'Auto-close' },
  { key: 'closable', label: 'Closable' },
  { key: 'pausable', label: 'Pausable' },
  { key: 'renewable', label: 'Renewable' },
]

const columns: Column<Plan>[] = [
  {
    key: 'name',
    header: 'Plan',
    render: (p) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{p.name}</span>
        {!p.isActive && <Badge>Archived</Badge>}
      </div>
    ),
  },
  {
    key: 'price',
    header: 'Price',
    render: (p) => (
      <span className="whitespace-nowrap">
        {formatMoney(p.price)} <span className="text-gray-500">/ {formatPeriod(p.billingPeriod, p.billingInterval)}</span>
      </span>
    ),
  },
  { key: 'minQuantity', header: 'Min qty', align: 'right' },
  { key: 'availability', header: 'Available', render: availabilityLabel },
  {
    key: 'options',
    header: 'Options',
    render: (p) => (
      <div className="flex flex-wrap gap-1">
        {OPTION_BADGES.filter((o) => p[o.key]).map((o) => (
          <Badge key={o.key} tone="info">
            {o.label}
          </Badge>
        ))}
      </div>
    ),
  },
  { key: 'activeSubscriptions', header: 'Active subs', align: 'right' },
]

export function PlansListPage() {
  const navigate = useNavigate()
  const isAdmin = useAuth().user?.role === 'ADMIN'
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const billingPeriod = (params.get('period') ?? '') as BillingPeriod | ''
  const availableNow = params.get('available') === '1'
  const { data, isLoading, isError, error } = usePlans({
    page,
    limit: LIMIT,
    q: q || undefined,
    billingPeriod: billingPeriod || undefined,
    availableOn: availableNow ? toDateInput(new Date()) : undefined,
  })

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    setParams(p, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Recurring plans"
        subtitle="What a subscription costs and how often it bills"
        actions={
          isAdmin && (
            <Button onClick={() => navigate('/app/plans/new')}>
              <Plus className="h-4 w-4" /> New plan
            </Button>
          )
        }
      />
      <Card className="p-4">
        <Tabs tabs={TABS} value={billingPeriod} onChange={(key) => setParam('period', key)} />
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Checkbox
            id="plans-available"
            label="Only plans available today"
            checked={availableNow}
            onChange={(e) => setParam('available', e.target.checked ? '1' : '')}
          />
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search plans" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load plans')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(p) => p.id}
              loading={isLoading}
              onRowClick={(p) => navigate(`/app/plans/${p.id}`)}
              emptyTitle={q || billingPeriod || availableNow ? 'No plans match these filters' : 'No plans yet'}
              emptyDescription={isAdmin && !q ? 'Create a plan such as "Pro Monthly" to start selling subscriptions.' : undefined}
            />
            {data && data.meta.total > 0 && (
              <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={(p) => setParam('page', String(p))} />
            )}
          </>
        )}
      </Card>
    </>
  )
}
