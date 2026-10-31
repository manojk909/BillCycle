import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, DataTable, PageHeader, Pagination, SearchInput, Tabs, type Column } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useDiscounts, type Discount, type DiscountStatus } from '../api'
import { STATUS_BADGE, formatDiscountValue } from '../summary'

const LIMIT = 20

const TABS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'expired', label: 'Expired' },
  { key: 'exhausted', label: 'Used up' },
  { key: 'inactive', label: 'Inactive' },
]

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) return <span className="text-sm text-gray-600">{used} used</span>
  const pct = Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="w-28">
      <div className="mb-1 text-xs text-gray-600">
        used {used} / {limit}
      </div>
      <div className="h-1.5 rounded-full bg-gray-200">
        <div className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-warning-600' : 'bg-primary-600'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const columns: Column<Discount>[] = [
  {
    key: 'name',
    header: 'Discount',
    render: (d) => (
      <div>
        <div className="font-medium text-gray-900">{d.name}</div>
        {d.code && <div className="font-mono text-xs text-gray-500">{d.code}</div>}
      </div>
    ),
  },
  { key: 'value', header: 'Value', render: (d) => <span className="font-medium">{formatDiscountValue(d.type, d.value)}</span> },
  {
    key: 'scope',
    header: 'Applies to',
    render: (d) =>
      d.scope === 'SUBSCRIPTION' ? 'Whole subscription' : d.products.map((p) => p.name).join(', ') || 'Products',
  },
  { key: 'validity', header: 'Valid', render: (d) => `${formatDate(d.startDate)} – ${formatDate(d.endDate)}` },
  { key: 'usage', header: 'Usage', render: (d) => <UsageBar used={d.timesUsed} limit={d.usageLimit} /> },
  { key: 'status', header: 'Status', render: (d) => <Badge tone={STATUS_BADGE[d.status].tone}>{STATUS_BADGE[d.status].label}</Badge> },
]

export function DiscountsListPage() {
  const navigate = useNavigate()
  const isAdmin = useAuth().user?.role === 'ADMIN'
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const status = (params.get('status') ?? '') as DiscountStatus | ''
  const { data, isLoading, isError, error } = useDiscounts({ page, limit: LIMIT, q: q || undefined, status: status || undefined })

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
        title="Discount rules"
        subtitle="Applied automatically when invoices are generated"
        actions={
          isAdmin && (
            <Button onClick={() => navigate('/app/discounts/new')}>
              <Plus className="h-4 w-4" /> New discount
            </Button>
          )
        }
      />
      <Card className="p-4">
        <Tabs tabs={TABS} value={status} onChange={(key) => setParam('status', key)} />
        <div className="mb-3 flex justify-end">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search name or code" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load discounts')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(d) => d.id}
              loading={isLoading}
              onRowClick={(d) => navigate(`/app/discounts/${d.id}`)}
              emptyTitle={q || status ? 'No discounts match these filters' : 'No discount rules yet'}
              emptyDescription={isAdmin && !q && !status ? 'Create a rule such as 10% off subscriptions with 10+ seats.' : undefined}
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
