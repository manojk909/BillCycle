import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import {
  Button,
  Card,
  DataTable,
  PageHeader,
  Pagination,
  SearchInput,
  StateBadge,
  Tabs,
  type Column,
  type TabItem,
} from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useSubscriptions, type SubscriptionRow, type SubscriptionState } from '../api'

const LIMIT = 20

const TABS: TabItem[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'QUOTATION', label: 'Quotation' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PAUSED', label: 'Paused' },
  { key: 'CLOSED', label: 'Closed' },
]

const columns: Column<SubscriptionRow>[] = [
  { key: 'number', header: 'Number', render: (s) => s.number ?? <span className="text-gray-400">Draft</span> },
  { key: 'customer', header: 'Customer', render: (s) => s.customer.name },
  { key: 'plan', header: 'Plan', render: (s) => s.plan.name },
  { key: 'state', header: 'Status', render: (s) => <StateBadge state={s.state} /> },
  { key: 'nextInvoiceDate', header: 'Next invoice', render: (s) => formatDate(s.nextInvoiceDate) },
  { key: 'amountTotal', header: 'Total', align: 'right', render: (s) => formatMoney(s.amountTotal) },
]

export function SubscriptionsListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const tab = (params.get('state') ?? 'ALL') as 'ALL' | SubscriptionState

  const { data, isLoading, isError, error } = useSubscriptions({
    page,
    limit: LIMIT,
    q: q || undefined,
    state: tab === 'ALL' ? undefined : tab,
    sort: '-createdAt',
  })

  function update(next: { page?: number; q?: string; state?: string }) {
    const p = new URLSearchParams(params)
    if (next.q !== undefined) {
      if (next.q) p.set('q', next.q)
      else p.delete('q')
      p.delete('page')
    }
    if (next.state !== undefined) {
      if (next.state === 'ALL') p.delete('state')
      else p.set('state', next.state)
      p.delete('page')
    }
    if (next.page !== undefined) p.set('page', String(next.page))
    setParams(p, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring agreements from quotation to active billing"
        actions={
          <Button onClick={() => navigate('/app/subscriptions/new')}>
            <Plus className="h-4 w-4" /> New subscription
          </Button>
        }
      />
      <Card className="p-4">
        <Tabs tabs={TABS} value={tab} onChange={(key) => update({ state: key })} />
        <div className="mb-3">
          <SearchInput value={q} onChange={(value) => update({ q: value })} placeholder="Search number or customer" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load subscriptions')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(s) => s.id}
              loading={isLoading}
              onRowClick={(s) => navigate(`/app/subscriptions/${s.id}`)}
              emptyTitle={q ? 'No subscriptions match your search' : 'No subscriptions yet'}
              emptyDescription={q ? 'Try a different number or customer.' : 'Create your first subscription to start billing.'}
            />
            {data && data.meta.total > 0 && (
              <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={(p) => update({ page: p })} />
            )}
          </>
        )}
      </Card>
    </>
  )
}
