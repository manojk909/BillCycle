import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardBody, CardHeader, DataTable, PageHeader, PageSpinner, StateBadge, StatusBar, type Column } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney, formatPeriod } from '@/lib/format'
import { useMySubscription, type MySubscription } from '../api'
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge'

const STEPS = [
  { key: 'QUOTATION', label: 'Quotation' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'CLOSED', label: 'Closed' },
]

type Line = MySubscription['lines'][number]
type Inv = MySubscription['invoices'][number]

const lineColumns: Column<Line>[] = [
  {
    key: 'description',
    header: 'Item',
    render: (l) => (
      <span className={l.isActive ? '' : 'text-gray-400 line-through'}>
        {l.description}
        {!l.isActive && <span className="ml-2 text-xs no-underline">(switched off)</span>}
      </span>
    ),
  },
  { key: 'quantity', header: 'Qty', align: 'right' },
  { key: 'unitPrice', header: 'Unit price', align: 'right', render: (l) => formatMoney(l.unitPrice) },
  { key: 'taxes', header: 'Taxes', render: (l) => l.taxes.map((t) => t.name).join(', ') || '—' },
  { key: 'amountUntaxed', header: 'Amount', align: 'right', render: (l) => formatMoney(l.amountUntaxed) },
]

const invoiceColumns: Column<Inv>[] = [
  { key: 'number', header: 'Invoice', render: (i) => <span className="font-medium text-primary-700">{i.number}</span> },
  { key: 'invoiceDate', header: 'Date', render: (i) => formatDate(i.invoiceDate) },
  { key: 'dueDate', header: 'Due', render: (i) => formatDate(i.dueDate) },
  { key: 'status', header: 'Status', render: (i) => <InvoiceStatusBadge status={i.status} /> },
  { key: 'amountDue', header: 'Due amount', align: 'right', render: (i) => formatMoney(i.amountDue) },
]

export function MySubscriptionPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { data: sub, isLoading, isError, error } = useMySubscription(id)

  if (isLoading) return <PageSpinner />
  if (isError || !sub) return <p className="py-10 text-center text-sm text-danger-600">{errorMessage(error, 'Subscription not found')}</p>

  const allowed = [sub.plan.pausable && 'pause', sub.plan.closable && 'close early', sub.plan.renewable && 'renew'].filter(Boolean)

  return (
    <>
      <PageHeader
        title={sub.plan.name}
        subtitle={sub.number}
        breadcrumbs={[{ label: 'My subscriptions', to: '/my/subscriptions' }, { label: sub.number ?? '' }]}
        actions={<StateBadge state={sub.state} />}
      />
      <Card className="mb-5 p-4">
        <StatusBar steps={STEPS} current={sub.state === 'PAUSED' ? 'ACTIVE' : sub.state} />
      </Card>

      <div className="mb-5 grid gap-5 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader title="What you pay" />
          <CardBody className="space-y-4">
            <DataTable columns={lineColumns} rows={sub.lines} rowKey={(l) => l.id} />
            <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <dt>Untaxed</dt>
                <dd>{formatMoney(sub.amountUntaxed)}</dd>
              </div>
              <div className="flex justify-between text-gray-600">
                <dt>Tax</dt>
                <dd>{formatMoney(sub.amountTax)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-900">
                <dt>Total per {formatPeriod(sub.plan.billingPeriod, sub.plan.billingInterval)}</dt>
                <dd>{formatMoney(sub.amountTotal)}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Details" />
          <CardBody>
            <dl className="space-y-2 text-sm">
              {[
                ['Seats', sub.quantity],
                ['Started', formatDate(sub.startDate)],
                ['Ends', sub.expiryDate ? formatDate(sub.expiryDate) : 'Open-ended'],
                ['Next invoice', sub.nextInvoiceDate ? formatDate(sub.nextInvoiceDate) : '—'],
                ['Payment terms', sub.paymentTerm.name],
                ...(sub.state === 'QUOTATION' && sub.quotationValidUntil ? [['Offer valid until', formatDate(sub.quotationValidUntil)]] : []),
                ...(sub.state === 'CLOSED' ? [['Closed', `${formatDate(sub.closedAt)}${sub.closeReason ? ` · ${sub.closeReason}` : ''}`]] : []),
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="text-right font-medium text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>
            {allowed.length > 0 && (
              <p className="mt-4 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Your plan lets you {allowed.join(', ')}. Contact Brightloop to make a change.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent invoices" />
        <CardBody>
          <DataTable
            columns={invoiceColumns}
            rows={sub.invoices}
            rowKey={(i) => i.id}
            onRowClick={(i) => navigate(`/my/invoices/${i.id}`)}
            emptyTitle="No invoices yet"
          />
        </CardBody>
      </Card>
    </>
  )
}
