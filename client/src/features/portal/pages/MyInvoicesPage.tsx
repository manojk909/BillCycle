import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, DataTable, PageHeader, Pagination, type Column } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useMyInvoices, type MyInvoiceRow } from '../api'
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge'

const LIMIT = 20

const columns: Column<MyInvoiceRow>[] = [
  { key: 'number', header: 'Invoice', render: (i) => <span className="font-medium text-primary-700">{i.number}</span> },
  { key: 'plan', header: 'Plan', render: (i) => i.subscription.plan.name },
  { key: 'period', header: 'Period', render: (i) => `${formatDate(i.periodStart)} – ${formatDate(i.periodEnd)}` },
  {
    key: 'dueDate',
    header: 'Due',
    render: (i) => <span className={i.status === 'OVERDUE' ? 'font-medium text-danger-600' : ''}>{formatDate(i.dueDate)}</span>,
  },
  { key: 'status', header: 'Status', render: (i) => <InvoiceStatusBadge status={i.status} /> },
  { key: 'amountTotal', header: 'Total', align: 'right', render: (i) => formatMoney(i.amountTotal) },
  { key: 'amountDue', header: 'Due amount', align: 'right', render: (i) => <span className="font-medium">{formatMoney(i.amountDue)}</span> },
]

export function MyInvoicesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useMyInvoices({ page, limit: LIMIT })

  return (
    <>
      <PageHeader title="My invoices" subtitle="Download or print any invoice, and see what is still due" />
      <Card className="p-4">
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load your invoices')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(i) => i.id}
              loading={isLoading}
              onRowClick={(i) => navigate(`/my/invoices/${i.id}`)}
              emptyTitle="No invoices yet"
            />
            {data && data.meta.total > LIMIT && <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={setPage} />}
          </>
        )}
      </Card>
    </>
  )
}
