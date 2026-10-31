import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DataTable,
  PageHeader,
  StateBadge,
  StatusBar,
  useToast,
  type Column,
  type StatusStep,
} from '@/components/ui'
import { RegisterPaymentModal } from '@/features/payments/components/RegisterPaymentModal'
import { PaymentHistory } from '@/features/payments/components/PaymentHistory'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useInvoice, useInvoiceAction, type InvoiceLine } from '../api'

const STEPS: StatusStep[] = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PAID', label: 'Paid' },
]

const lineColumns: Column<InvoiceLine>[] = [
  {
    key: 'description',
    header: 'Description',
    render: (l) => (
      <span className="font-medium text-gray-900">
        {l.description}
        {l.isPlanLine && <span className="ml-2 text-xs text-primary-700">Plan</span>}
      </span>
    ),
  },
  { key: 'quantity', header: 'Qty', align: 'right', render: (l) => l.quantity },
  { key: 'unitPrice', header: 'Unit price', align: 'right', render: (l) => formatMoney(l.unitPrice) },
  { key: 'discountAmount', header: 'Discount', align: 'right', render: (l) => formatMoney(l.discountAmount) },
  { key: 'taxes', header: 'Taxes', render: (l) => (l.taxes.length ? l.taxes.map((t) => t.name).join(', ') : '—') },
  { key: 'amountTotal', header: 'Amount', align: 'right', render: (l) => formatMoney(l.amountTotal) },
]

export function InvoiceDetailPage() {
  const { id } = useParams()
  const invoiceId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { data: inv, isLoading } = useInvoice(invoiceId)
  const action = useInvoiceAction(invoiceId)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  if (isLoading || !inv) return <PageHeader title="Invoice" subtitle="Loading…" />

  const can = (a: string) => inv.allowedActions.includes(a)
  const currentStep = inv.state === 'CANCELLED' ? 'DRAFT' : inv.state

  async function run(a: 'confirm' | 'cancel' | 'send') {
    try {
      await action.mutateAsync(a)
      toast.success(`Invoice ${a}${a === 'cancel' ? 'led' : a === 'confirm' ? 'ed' : 'ed'}`)
    } catch (err) {
      toast.error(errorMessage(err, `Could not ${a} the invoice`))
    } finally {
      setConfirmCancel(false)
    }
  }

  return (
    <>
      <PageHeader
        title={inv.number ?? 'Draft invoice'}
        breadcrumbs={[{ label: 'Invoices', to: '/app/invoices' }, { label: inv.number ?? 'Draft' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/app/invoices')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {inv.number && (
              <Button variant="secondary" onClick={() => navigate(`/app/invoices/${inv.id}/print`)}>
                <Printer className="h-4 w-4" /> Print
              </Button>
            )}
            {can('confirm') && (
              <Button onClick={() => run('confirm')} loading={action.isPending}>
                Confirm
              </Button>
            )}
            {can('send') && (
              <Button variant="secondary" onClick={() => run('send')} loading={action.isPending}>
                Send
              </Button>
            )}
            {(inv.state === 'CONFIRMED' || inv.state === 'PAID') && Number(inv.amountDue) > 0 && (
              <Button onClick={() => setPayOpen(true)}>Register payment</Button>
            )}
            {can('cancel') && (
              <Button variant="danger" onClick={() => setConfirmCancel(true)}>
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <StatusBar steps={STEPS} current={currentStep} />
        <StateBadge state={inv.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Lines" />
          <CardBody>
            <DataTable columns={lineColumns} rows={inv.lines} rowKey={(l) => l.id} emptyTitle="No lines" />
            <dl className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
              <Total label="Untaxed" value={inv.amountUntaxed} />
              {Number(inv.amountDiscount) > 0 && <Total label="Discount" value={inv.amountDiscount} />}
              <Total label="Tax" value={inv.amountTax} />
              <Total label="Total" value={inv.amountTotal} bold />
              <Total label="Paid" value={inv.amountPaid} />
              <Total label="Due" value={inv.amountDue} bold />
            </dl>
          </CardBody>

          <CardHeader title="Payments" />
          <CardBody>
            <PaymentHistory invoiceId={inv.id} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="space-y-3 text-sm">
            <Info label="Bill to" value={inv.billingName} />
            <Info label="Email" value={inv.billingEmail} />
            {inv.billingAddress && <Info label="Address" value={inv.billingAddress} />}
            <Info label="Period" value={`${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`} />
            <Info label="Invoice date" value={formatDate(inv.invoiceDate)} />
            <Info label="Due date" value={formatDate(inv.dueDate)} />
            <div>
              <dt className="text-xs text-gray-500">Subscription</dt>
              <dd>
                <button
                  className="text-primary-700 hover:underline"
                  onClick={() => navigate(`/app/subscriptions/${inv.subscription.id}`)}
                >
                  {inv.subscription.number ?? `#${inv.subscription.id}`}
                </button>
              </dd>
            </div>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel invoice?"
        message={`This will cancel invoice ${inv.number ?? 'this draft'}. This cannot be undone.`}
        confirmLabel="Cancel invoice"
        tone="danger"
        loading={action.isPending}
        onConfirm={() => run('cancel')}
        onCancel={() => setConfirmCancel(false)}
      />

      <RegisterPaymentModal
        invoice={{ id: inv.id, number: inv.number, amountDue: inv.amountDue, customerName: inv.customer.name }}
        open={payOpen}
        onClose={() => setPayOpen(false)}
      />
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}

function Total({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'border-t border-gray-200 pt-1 font-semibold text-gray-900' : 'text-gray-600'}`}>
      <dt>{label}</dt>
      <dd>{formatMoney(value)}</dd>
    </div>
  )
}
