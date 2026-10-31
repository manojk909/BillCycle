import { Link, useSearchParams } from 'react-router-dom'
import { Card, DataTable, Input, PageHeader, Pagination, SearchInput, Select, type Column } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { usePaymentMethods, usePayments, type Payment } from '../api'

const LIMIT = 20

const columns: Column<Payment>[] = [
  { key: 'date', header: 'Date', render: (p) => formatDate(p.date) },
  {
    key: 'invoice',
    header: 'Invoice',
    render: (p) => (
      <Link to={`/app/invoices/${p.invoice.id}`} className="font-medium text-primary-700 hover:underline" onClick={(e) => e.stopPropagation()}>
        {p.invoice.number ?? 'Draft'}
      </Link>
    ),
  },
  { key: 'customer', header: 'Customer', render: (p) => p.invoice.customer.name },
  { key: 'method', header: 'Method', render: (p) => p.method.name },
  { key: 'note', header: 'Note', render: (p) => p.note ?? '—', className: 'max-w-xs truncate' },
  { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className="font-medium">{formatMoney(p.amount)}</span> },
]

export function PaymentsPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const methodId = params.get('methodId') ?? ''
  const { data: methods = [] } = usePaymentMethods()
  const { data, isLoading, isError, error } = usePayments({
    page,
    limit: LIMIT,
    q: q || undefined,
    from: from || undefined,
    to: to || undefined,
    methodId: methodId ? Number(methodId) : undefined,
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
      <PageHeader title="Payments" subtitle="Money received against invoices, by method and date" />
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Invoice no., customer or note" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            From
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setParam('from', e.target.value)} className="w-40" />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            To
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setParam('to', e.target.value)} className="w-40" />
          </label>
          <Select
            aria-label="Payment method"
            value={methodId}
            placeholder="All methods"
            options={methods.map((m) => ({ value: m.id, label: m.name }))}
            onChange={(e) => setParam('methodId', e.target.value)}
            className="w-40"
          />
          {data && (
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-500">Total of {data.meta.total} payments</div>
              <div className="text-lg font-semibold text-gray-900">{formatMoney(data.summary.totalAmount)}</div>
            </div>
          )}
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load payments')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(p) => p.id}
              loading={isLoading}
              emptyTitle="No payments found"
              emptyDescription="Payments appear here when they are recorded on an invoice."
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
