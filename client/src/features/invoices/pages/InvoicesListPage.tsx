import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  Card,
  DataTable,
  PageHeader,
  Pagination,
  SearchInput,
  StateBadge,
  Tabs,
  useToast,
  type Column,
  type TabItem,
} from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useInvoices, useBulkConfirm, type InvoiceRow } from '../api'

const LIMIT = 20

const TABS: TabItem[] = [
  { key: 'ALL', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'partial', label: 'Partially paid' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
]

function daysOverdue(due: string) {
  const diff = Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000)
  return diff > 0 ? diff : 0
}

export function InvoicesListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const tab = params.get('status') ?? 'ALL'
  const subscriptionId = params.get('subscriptionId') ? Number(params.get('subscriptionId')) : undefined
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const bulk = useBulkConfirm()

  const { data, isLoading, isError, error } = useInvoices({
    page,
    limit: LIMIT,
    q: q || undefined,
    status: tab === 'ALL' ? undefined : tab,
    subscriptionId,
  })

  function update(next: { page?: number; q?: string; status?: string }) {
    const p = new URLSearchParams(params)
    if (next.q !== undefined) {
      if (next.q) p.set('q', next.q)
      else p.delete('q')
      p.delete('page')
    }
    if (next.status !== undefined) {
      if (next.status === 'ALL') p.delete('status')
      else p.set('status', next.status)
      p.delete('page')
    }
    if (next.page !== undefined) p.set('page', String(next.page))
    setParams(p, { replace: true })
    setSelected(new Set())
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function confirmSelected() {
    try {
      const r = await bulk.mutateAsync([...selected])
      toast.success(`${r.confirmed} invoice(s) confirmed`)
      setSelected(new Set())
    } catch (err) {
      toast.error(errorMessage(err, 'Could not confirm invoices'))
    }
  }

  const rows = data?.data ?? []
  const selectableDrafts = rows.filter((r) => r.state === 'DRAFT')

  const columns: Column<InvoiceRow>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          aria-label="Select all drafts"
          checked={selectableDrafts.length > 0 && selectableDrafts.every((r) => selected.has(r.id))}
          onChange={(e) =>
            setSelected(e.target.checked ? new Set(selectableDrafts.map((r) => r.id)) : new Set())
          }
        />
      ),
      render: (r) =>
        r.state === 'DRAFT' ? (
          <input
            type="checkbox"
            aria-label={`Select invoice ${r.id}`}
            checked={selected.has(r.id)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggle(r.id)}
          />
        ) : null,
    },
    { key: 'number', header: 'Number', render: (r) => r.number ?? <span className="text-gray-400">Draft</span> },
    { key: 'customer', header: 'Customer', render: (r) => r.customer.name },
    { key: 'invoiceDate', header: 'Invoice date', render: (r) => formatDate(r.invoiceDate) },
    {
      key: 'dueDate',
      header: 'Due date',
      render: (r) => {
        const od = r.status === 'OVERDUE' ? daysOverdue(r.dueDate) : 0
        return (
          <span className={od ? 'text-danger-600' : undefined}>
            {formatDate(r.dueDate)}
            {od > 0 && <span className="ml-1 text-xs">· {od} days overdue</span>}
          </span>
        )
      },
    },
    { key: 'amountTotal', header: 'Total', align: 'right', render: (r) => formatMoney(r.amountTotal) },
    { key: 'amountDue', header: 'Due', align: 'right', render: (r) => formatMoney(r.amountDue) },
    { key: 'status', header: 'Status', render: (r) => <StateBadge state={r.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Billed periods — confirm, send, print and track payment"
        actions={
          selected.size > 0 ? (
            <Button onClick={confirmSelected} loading={bulk.isPending}>
              Confirm selected ({selected.size})
            </Button>
          ) : undefined
        }
      />
      <Card className="p-4">
        <Tabs tabs={TABS} value={tab} onChange={(key) => update({ status: key })} />
        <div className="mb-3">
          <SearchInput value={q} onChange={(value) => update({ q: value })} placeholder="Search number or customer" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load invoices')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              loading={isLoading}
              onRowClick={(r) => navigate(`/app/invoices/${r.id}`)}
              emptyTitle={q ? 'No invoices match your search' : 'No invoices yet'}
              emptyDescription={q ? 'Try a different number or customer.' : 'Run billing to generate invoices.'}
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
