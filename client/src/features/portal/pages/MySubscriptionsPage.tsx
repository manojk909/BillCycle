import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, ChevronRight } from 'lucide-react'
import { Card, EmptyState, KpiCard, PageHeader, PageSpinner, Pagination, StateBadge } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney, formatPeriod } from '@/lib/format'
import { useMySubscriptions, usePortalSummary } from '../api'

const LIMIT = 10

export function MySubscriptionsPage() {
  const [page, setPage] = useState(1)
  const summary = usePortalSummary()
  const { data, isLoading, isError, error } = useMySubscriptions({ page, limit: LIMIT })
  const s = summary.data

  return (
    <>
      <PageHeader title="My subscriptions" subtitle="Your plans, what you pay and when the next invoice is due" />

      {s && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <KpiCard label="Active subscriptions" value={s.activeSubscriptions} />
          <KpiCard
            label="Amount due"
            value={formatMoney(s.amountDue)}
            tone={s.overdueInvoices ? 'danger' : 'default'}
            hint={s.overdueInvoices ? `${formatMoney(s.overdueAmount)} overdue on ${s.overdueInvoices} invoice(s)` : `${s.openInvoices} open invoice(s)`}
          />
          <KpiCard label="Next invoice" value={s.nextInvoiceDate ? formatDate(s.nextInvoiceDate) : '—'} icon={<CalendarClock className="h-4 w-4" />} />
        </div>
      )}

      {isLoading && <PageSpinner />}
      {isError && <p className="text-sm text-danger-600">{errorMessage(error, 'Could not load your subscriptions')}</p>}
      {data && data.data.length === 0 && (
        <Card>
          <EmptyState title="No subscriptions yet" description="When Brightloop sets up a plan for you, it will appear here." />
        </Card>
      )}

      <div className="space-y-3">
        {data?.data.map((sub) => (
          <Link
            key={sub.id}
            to={`/my/subscriptions/${sub.id}`}
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/30"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">{sub.plan.name}</span>
                <StateBadge state={sub.state} />
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {sub.number} · {sub.quantity} seat{sub.quantity > 1 ? 's' : ''} · since {formatDate(sub.startDate)}
                {sub.nextInvoiceDate && ` · next invoice ${formatDate(sub.nextInvoiceDate)}`}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">{formatMoney(sub.amountTotal)}</div>
              <div className="text-xs text-gray-500">per {formatPeriod(sub.plan.billingPeriod, sub.plan.billingInterval)}</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
          </Link>
        ))}
      </div>
      {data && data.meta.total > LIMIT && <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={setPage} />}
    </>
  )
}
