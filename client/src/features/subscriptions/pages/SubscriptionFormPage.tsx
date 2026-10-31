import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Plus } from 'lucide-react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  PageHeader,
  Select,
  StateBadge,
  StatusBar,
  useToast,
  type Column,
  type StatusStep,
} from '@/components/ui'
import { CustomerPicker } from '@/features/customers/components/CustomerPicker'
import type { CustomerOption } from '@/features/customers/api'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney, formatPeriod, toDateInput } from '@/lib/format'
import {
  useCreateSubscription,
  usePlanOptions,
  usePaymentTermOptions,
  useSubscription,
  useSubscriptionAction,
  useSubscriptionActivity,
  useGenerateInvoice,
  type SubscriptionLine,
} from '../api'

const STEPS: StatusStep[] = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'QUOTATION', label: 'Quotation' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'CLOSED', label: 'Closed' },
]

const ACTION_LABEL: Record<string, string> = {
  send: 'Send',
  confirm: 'Confirm',
  activate: 'Activate',
  pause: 'Pause',
  resume: 'Resume',
  renew: 'Renew',
  close: 'Close',
  cancel: 'Cancel',
}

export function SubscriptionFormPage() {
  const { id } = useParams()
  return id && id !== 'new' ? <SubscriptionDetail id={Number(id)} /> : <SubscriptionCreate />
}

// ---------------- Create ----------------

function SubscriptionCreate() {
  const navigate = useNavigate()
  const toast = useToast()
  const create = useCreateSubscription()
  const { data: plans = [] } = usePlanOptions()
  const { data: terms = [] } = usePaymentTermOptions()

  const [customer, setCustomer] = useState<CustomerOption | null>(null)
  const [planId, setPlanId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [startDate, setStartDate] = useState(toDateInput(new Date()))
  const [expiryDate, setExpiryDate] = useState('')
  const [paymentTermId, setPaymentTermId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const plan = plans.find((p) => String(p.id) === planId)

  async function submit() {
    setErrors({})
    const fieldErrs: Record<string, string> = {}
    if (!customer) fieldErrs.customerId = 'Choose a customer'
    if (!planId) fieldErrs.planId = 'Choose a plan'
    if (!paymentTermId) fieldErrs.paymentTermId = 'Choose a payment term'
    if (Object.keys(fieldErrs).length) return setErrors(fieldErrs)
    try {
      const sub = await create.mutateAsync({
        customerId: customer!.id,
        planId: Number(planId),
        quantity: Number(quantity),
        startDate,
        expiryDate: expiryDate || undefined,
        paymentTermId: Number(paymentTermId),
        lines: [],
      })
      toast.success(`Subscription ${sub.number ?? ''} created`)
      navigate(`/app/subscriptions/${sub.id}`)
    } catch (err) {
      const e = err as { fields?: Record<string, string> }
      if (e.fields) setErrors(e.fields)
      else toast.error(errorMessage(err, 'Could not create subscription'))
    }
  }

  return (
    <>
      <PageHeader
        title="New subscription"
        breadcrumbs={[{ label: 'Subscriptions', to: '/app/subscriptions' }, { label: 'New' }]}
        actions={
          <Button variant="secondary" onClick={() => navigate('/app/subscriptions')}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />
      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormField label="Customer" error={errors.customerId} required>
            <CustomerPicker value={customer} onChange={setCustomer} invalid={!!errors.customerId} />
          </FormField>
          <FormField label="Plan" error={errors.planId} required>
            <Select
              placeholder={plans.length ? 'Choose a plan…' : 'No plans available'}
              invalid={!!errors.planId}
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} — ${formatMoney(p.price)} / ${formatPeriod(p.billingPeriod, p.billingInterval)} · min ${p.minQuantity}`,
              }))}
            />
          </FormField>
          <FormField label="Quantity" error={errors.quantity} hint={plan ? `Minimum ${plan.minQuantity}` : undefined} required>
            <Input type="number" min={1} value={quantity} invalid={!!errors.quantity} onChange={(e) => setQuantity(e.target.value)} />
          </FormField>
          <FormField label="Payment term" error={errors.paymentTermId} required>
            <Select
              placeholder={terms.length ? 'Choose…' : 'No terms available'}
              invalid={!!errors.paymentTermId}
              value={paymentTermId}
              onChange={(e) => setPaymentTermId(e.target.value)}
              options={terms.map((t) => ({ value: t.id, label: t.name }))}
            />
          </FormField>
          <FormField label="Start date" error={errors.startDate} required>
            <Input type="date" value={startDate} invalid={!!errors.startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="Expiry date" error={errors.expiryDate} hint="Optional">
            <Input type="date" value={expiryDate} invalid={!!errors.expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </FormField>
        </CardBody>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <Button variant="secondary" onClick={() => navigate('/app/subscriptions')}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending}>
            Create subscription
          </Button>
        </div>
      </Card>
    </>
  )
}

// ---------------- Detail ----------------

const lineColumns: Column<SubscriptionLine>[] = [
  {
    key: 'description',
    header: 'Description',
    render: (l) => (
      <div>
        <span className="font-medium text-gray-900">{l.description}</span>
        {l.isPlanLine && <span className="ml-2 text-xs text-primary-700">Plan</span>}
        {!l.isPlanLine && !l.isActive && <span className="ml-2 text-xs text-gray-400">inactive</span>}
      </div>
    ),
  },
  { key: 'quantity', header: 'Qty', align: 'right', render: (l) => l.quantity },
  { key: 'unitPrice', header: 'Unit price', align: 'right', render: (l) => formatMoney(l.unitPrice) },
  { key: 'taxes', header: 'Taxes', render: (l) => (l.taxes.length ? l.taxes.map((t) => t.name).join(', ') : '—') },
  { key: 'amountTotal', header: 'Amount', align: 'right', render: (l) => formatMoney(l.amountTotal) },
]

function SubscriptionDetail({ id }: { id: number }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: sub, isLoading } = useSubscription(id)
  const { data: activity = [] } = useSubscriptionActivity(id)
  const action = useSubscriptionAction(id)
  const generate = useGenerateInvoice(id)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const steps = useMemo(() => {
    if (sub?.state === 'PAUSED') {
      return STEPS.map((s) => (s.key === 'ACTIVE' ? { key: 'PAUSED', label: 'Paused' } : s))
    }
    return STEPS
  }, [sub?.state])

  if (isLoading || !sub) {
    return <PageHeader title="Subscription" subtitle="Loading…" />
  }

  async function runAction(a: string, withReason?: string) {
    try {
      await action.mutateAsync({ action: a, reason: withReason })
      toast.success(`Subscription ${ACTION_LABEL[a].toLowerCase()}d`)
    } catch (err) {
      toast.error(errorMessage(err, `Could not ${a} the subscription`))
    } finally {
      setConfirmAction(null)
      setReason('')
    }
  }

  async function createInvoice() {
    try {
      const r = await generate.mutateAsync()
      toast.success(r.status === 'created' ? 'Draft invoice created' : 'Already billed for this period')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create invoice'))
    }
  }

  const needsReason = (a: string) => a === 'close' || a === 'cancel'

  return (
    <>
      <PageHeader
        title={sub.number ?? 'Draft subscription'}
        breadcrumbs={[{ label: 'Subscriptions', to: '/app/subscriptions' }, { label: sub.number ?? 'Draft' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/app/subscriptions')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {sub.invoiceCount > 0 && (
              <Button variant="secondary" onClick={() => navigate(`/app/invoices?subscriptionId=${sub.id}`)}>
                <FileText className="h-4 w-4" /> Invoices ({sub.invoiceCount})
              </Button>
            )}
            {sub.state === 'ACTIVE' && (
              <Button variant="secondary" onClick={createInvoice} loading={generate.isPending}>
                <Plus className="h-4 w-4" /> Create invoice
              </Button>
            )}
            {sub.allowedActions.map((a) => (
              <Button
                key={a}
                variant={a === 'cancel' || a === 'close' ? 'danger' : a === 'confirm' || a === 'activate' ? 'primary' : 'secondary'}
                loading={action.isPending && confirmAction === a}
                onClick={() => (needsReason(a) ? setConfirmAction(a) : runAction(a))}
              >
                {ACTION_LABEL[a]}
              </Button>
            ))}
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <StatusBar steps={steps} current={sub.state} />
        <StateBadge state={sub.state} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Details" />
          <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Customer" value={`${sub.customer.name} · ${sub.customer.email}`} />
            <Info label="Plan" value={`${sub.plan.name} (${formatMoney(sub.plan.price)} / ${formatPeriod(sub.plan.billingPeriod, sub.plan.billingInterval)})`} />
            <Info label="Quantity" value={String(sub.quantity)} />
            <Info label="Payment term" value={sub.paymentTerm.name} />
            <Info label="Start date" value={formatDate(sub.startDate)} />
            <Info label="Expiry date" value={formatDate(sub.expiryDate)} />
            <Info label="Next invoice" value={formatDate(sub.nextInvoiceDate)} />
            {sub.quotationValidUntil && <Info label="Quotation valid until" value={formatDate(sub.quotationValidUntil)} />}
            {sub.closeReason && <Info label="Close reason" value={sub.closeReason} />}
          </CardBody>

          <CardHeader title="Lines" />
          <CardBody>
            <DataTable columns={lineColumns} rows={sub.lines} rowKey={(l) => l.id} emptyTitle="No lines" />
            <dl className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
              <Total label="Untaxed" value={sub.amountUntaxed} />
              <Total label="Tax" value={sub.amountTax} />
              <Total label="Total" value={sub.amountTotal} bold />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Activity" />
          <CardBody>
            {activity.length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet.</p>
            ) : (
              <ol className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="border-l-2 border-gray-200 pl-3">
                    <p className="text-sm text-gray-800">{a.message}</p>
                    <p className="text-xs text-gray-400">
                      {a.user?.name ?? 'System'} · {formatDate(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction ? `${ACTION_LABEL[confirmAction]} subscription?` : ''}
        message={
          <span>
            This will {confirmAction} subscription {sub.number ?? 'this draft'}.
            {confirmAction && needsReason(confirmAction) && (
              <Input className="mt-3" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            )}
          </span>
        }
        confirmLabel={confirmAction ? ACTION_LABEL[confirmAction] : 'Confirm'}
        tone="danger"
        loading={action.isPending}
        onConfirm={() => confirmAction && runAction(confirmAction, reason || undefined)}
        onCancel={() => {
          setConfirmAction(null)
          setReason('')
        }}
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
