import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CreditCard, Repeat, TrendingUp, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Card, CardBody, CardHeader, DataTable, Input, KpiCard, PageHeader, Select, Tabs, type Column } from '@/components/ui'
import { CustomerPicker } from '@/features/customers/components/CustomerPicker'
import type { CustomerOption } from '@/features/customers/api'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useOverdue, usePlanMrr, useRevenueTrend, useSummary, type OverdueRow, type ReportFilters } from '../api'

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function presetRange(key: string): { from: string; to: string } {
  const t = new Date()
  const y = t.getFullYear()
  const m = t.getMonth()
  switch (key) {
    case 'last-month':
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) }
    case 'quarter':
      return { from: ymd(new Date(y, Math.floor(m / 3) * 3, 1)), to: ymd(t) }
    case 'ytd':
      return { from: ymd(new Date(y, 0, 1)), to: ymd(t) }
    default:
      return { from: ymd(new Date(y, m, 1)), to: ymd(t) }
  }
}

const PRESETS = [
  { key: 'month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'custom', label: 'Custom' },
]

const shortMoney = (v: number) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'INR' }).format(v)
const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })

function agingTone(days: number) {
  if (days > 60) return 'danger'
  if (days > 30) return 'warning'
  return 'info'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [customer, setCustomer] = useState<CustomerOption | null>(null)
  const preset = params.get('range') ?? 'month'
  const range = preset === 'custom' ? { from: params.get('from') ?? '', to: params.get('to') ?? '' } : presetRange(preset)
  const planId = params.get('planId') ? Number(params.get('planId')) : undefined
  const filters: ReportFilters = {
    from: range.from || undefined,
    to: range.to || undefined,
    planId,
    customerId: customer?.id,
  }

  const summary = useSummary(filters)
  const trend = useRevenueTrend(filters)
  const overdue = useOverdue(filters)
  const plans = usePlanMrr(customer?.id)
  const s = summary.data

  function setParam(next: Record<string, string>) {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setParams(p, { replace: true })
  }

  const overdueColumns: Column<OverdueRow>[] = [
    {
      key: 'number',
      header: 'Invoice',
      render: (r) => <span className="font-medium text-primary-700">{r.number}</span>,
    },
    { key: 'customer', header: 'Customer', render: (r) => r.customer.name },
    { key: 'dueDate', header: 'Due', render: (r) => formatDate(r.dueDate) },
    { key: 'days', header: 'Late by', render: (r) => <Badge tone={agingTone(r.daysOverdue)}>{r.daysOverdue} days</Badge> },
    { key: 'amountDue', header: 'Amount due', align: 'right', render: (r) => <span className="font-medium">{formatMoney(r.amountDue)}</span> },
  ]

  const chartData = (trend.data ?? []).map((p) => ({ month: monthLabel(p.month), Invoiced: Number(p.invoiced), Collected: Number(p.collected) }))
  const maxPlanMrr = Math.max(1, ...(plans.data ?? []).map((p) => Number(p.mrr)))
  const loading = (v: string | number | undefined, fmt: (x: string | number) => string = String) =>
    summary.isLoading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-gray-100" /> : v === undefined ? '—' : fmt(v)

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Recurring revenue, collections and what needs chasing" />

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs tabs={PRESETS} value={preset} onChange={(key) => setParam({ range: key === 'month' ? '' : key })} />
          <div className="flex flex-wrap items-center gap-2">
            {preset === 'custom' && (
              <>
                <Input type="date" aria-label="From" value={range.from} max={range.to || undefined} onChange={(e) => setParam({ from: e.target.value })} className="w-40" />
                <Input type="date" aria-label="To" value={range.to} min={range.from || undefined} onChange={(e) => setParam({ to: e.target.value })} className="w-40" />
              </>
            )}
            <Select
              aria-label="Plan"
              value={planId ?? ''}
              placeholder="All plans"
              options={(plans.data ?? []).map((p) => ({ value: p.planId, label: p.plan }))}
              onChange={(e) => setParam({ planId: e.target.value })}
              className="w-44"
            />
            <div className="w-56">
              <CustomerPicker value={customer} onChange={setCustomer} placeholder="All customers" />
            </div>
          </div>
        </div>
      </Card>

      {summary.isError && <p className="mb-4 text-sm text-danger-600">{errorMessage(summary.error, 'Could not load dashboard')}</p>}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Active subscriptions"
          icon={<Repeat className="h-4 w-4" />}
          value={loading(s?.activeSubscriptions)}
          hint={s && `${s.pausedSubscriptions} paused · ${s.newSubscriptions} new in period`}
          onClick={() => navigate('/app/subscriptions?state=ACTIVE')}
        />
        <KpiCard
          label="MRR"
          icon={<TrendingUp className="h-4 w-4" />}
          value={loading(s?.mrr, (v) => formatMoney(v))}
          hint={s && `ARR ${formatMoney(s.arr)}`}
        />
        <KpiCard
          label="Collected"
          icon={<Wallet className="h-4 w-4" />}
          tone="success"
          value={loading(s?.collectedAmount, (v) => formatMoney(v))}
          hint={s && `${s.paymentsCount} payments · ${formatMoney(s.invoicedAmount)} invoiced`}
          onClick={() => navigate(`/app/payments?from=${range.from}&to=${range.to}`)}
        />
        <KpiCard
          label="Outstanding"
          icon={<CreditCard className="h-4 w-4" />}
          tone="warning"
          value={loading(s?.outstandingAmount, (v) => formatMoney(v))}
          hint={s && `${s.openInvoices} open invoices`}
          onClick={() => navigate('/app/invoices?status=outstanding')}
        />
        <KpiCard
          label="Overdue"
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="danger"
          value={loading(s?.overdueAmount, (v) => formatMoney(v))}
          hint={s && `${s.overdueCount} invoices past due`}
          onClick={() => navigate('/app/invoices?status=overdue')}
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Invoiced vs collected (last 6 months)" />
          <CardBody>
            <div className="h-64">
              {trend.isLoading ? (
                <div className="h-full animate-pulse rounded bg-gray-50" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickFormatter={shortMoney} tickLine={false} axisLine={false} fontSize={12} width={70} />
                    <Tooltip formatter={(v) => formatMoney(Number(v))} cursor={{ fill: 'rgba(113,75,103,0.06)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Invoiced" fill="var(--color-primary-600)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Collected" fill="var(--color-success-600)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="MRR by plan" />
          <CardBody className="space-y-3">
            {(plans.data ?? []).map((p) => (
              <div key={p.planId}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-gray-800">{p.plan}</span>
                  <span className="text-gray-600">{formatMoney(p.mrr)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-primary-600" style={{ width: `${(Number(p.mrr) / maxPlanMrr) * 100}%` }} />
                </div>
                <div className="mt-0.5 text-xs text-gray-500">{p.active} active</div>
              </div>
            ))}
            {plans.data?.length === 0 && <p className="text-sm text-gray-500">No plans yet</p>}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Overdue invoices"
          actions={
            <Link to="/app/invoices?status=overdue" className="text-sm font-medium text-primary-700 hover:underline">
              View all
            </Link>
          }
        />
        <CardBody>
          {overdue.data && (
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ['1–30 days', overdue.data.buckets.d1_30],
                  ['31–60 days', overdue.data.buckets.d31_60],
                  ['61–90 days', overdue.data.buckets.d61_90],
                  ['90+ days', overdue.data.buckets.d90_plus],
                ] as const
              ).map(([label, amount]) => (
                <div key={label} className="rounded-md bg-gray-50 px-3 py-2">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="text-sm font-semibold text-gray-900">{formatMoney(amount)}</div>
                </div>
              ))}
            </div>
          )}
          <DataTable
            columns={overdueColumns}
            rows={overdue.data?.rows ?? []}
            rowKey={(r) => r.id}
            loading={overdue.isLoading}
            onRowClick={(r) => navigate(`/app/invoices/${r.id}`)}
            emptyTitle="Nothing overdue"
            emptyDescription="Every confirmed invoice is paid or not yet due."
          />
        </CardBody>
      </Card>
    </>
  )
}
