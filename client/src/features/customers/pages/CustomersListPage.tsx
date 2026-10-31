import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, DataTable, PageHeader, Pagination, SearchInput, type Column } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCustomers, type CustomerRow } from '../api'

const LIMIT = 20

const columns: Column<CustomerRow>[] = [
  {
    key: 'name',
    header: 'Customer',
    render: (c) => (
      <div>
        <div className="font-medium text-gray-900">{c.name}</div>
        {c.companyName && <div className="text-xs text-gray-500">{c.companyName}</div>}
      </div>
    ),
  },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone', render: (c) => c.phone ?? '—' },
  { key: 'city', header: 'City', render: (c) => c.city ?? '—' },
  { key: 'subscriptionCount', header: 'Subscriptions', align: 'right' },
  {
    key: 'portal',
    header: 'Portal',
    render: (c) => (c.hasPortalAccess ? <Badge tone="success">Active</Badge> : <Badge>No login</Badge>),
  },
]

export function CustomersListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const { data, isLoading, isError, error } = useCustomers({ page, limit: LIMIT, q: q || undefined, sort: 'name' })

  function update(next: { page?: number; q?: string }) {
    const p = new URLSearchParams(params)
    if (next.q !== undefined) {
      if (next.q) p.set('q', next.q)
      else p.delete('q')
      p.delete('page')
    }
    if (next.page !== undefined) p.set('page', String(next.page))
    setParams(p, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Businesses that subscribe to Brightloop products"
        actions={
          <Button onClick={() => navigate('/app/customers/new')}>
            <Plus className="h-4 w-4" /> New customer
          </Button>
        }
      />
      <Card className="p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={q} onChange={(value) => update({ q: value })} placeholder="Search name, email or company" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load customers')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(c) => c.id}
              loading={isLoading}
              onRowClick={(c) => navigate(`/app/customers/${c.id}`)}
              emptyTitle={q ? 'No customers match your search' : 'No customers yet'}
              emptyDescription={q ? 'Try a different name or email.' : 'Add your first customer to start a subscription.'}
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
