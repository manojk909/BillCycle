import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Ban, X } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  PageHeader,
  PageSpinner,
  Switch,
  useToast,
  type Column,
} from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney } from '@/lib/format'
import { CustomerPicker } from '@/features/customers/components/CustomerPicker'
import { useDeactivateDiscount, useDiscount, useSaveDiscount, type DiscountDetail, type DiscountUsage } from '../api'
import { ProductMultiSelect } from '../components/ProductMultiSelect'
import { STATUS_BADGE, discountSummary } from '../summary'

const item = z.object({ id: z.number(), name: z.string() })
const money = /^\d+(\.\d{1,2})?$/
const count = /^[1-9]\d*$/

// productIds / customerIds hold {id, name} so chips can show names; they are mapped to ids on submit.
// Keeping the API's field names means server errors land on the right field.
const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
    code: z
      .string()
      .trim()
      .refine((v) => !v || /^[A-Za-z0-9_-]{3,30}$/.test(v), 'Use 3–30 letters, digits, - or _'),
    type: z.enum(['PERCENT', 'FIXED']),
    value: z.string().trim().regex(money, 'Enter a valid amount (up to 2 decimals)'),
    scope: z.enum(['PRODUCTS', 'SUBSCRIPTION']),
    productIds: z.array(item),
    customerIds: z.array(item),
    minPurchaseAmount: z.string().trim().refine((v) => !v || money.test(v), 'Enter a valid amount'),
    minQuantity: z.string().trim().refine((v) => !v || count.test(v), 'Enter a whole number of 1 or more'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    usageLimit: z.string().trim().refine((v) => !v || count.test(v), 'Enter a whole number of 1 or more'),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'PERCENT' && Number(v.value) > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'A percentage must be between 0 and 100' })
    if (v.type === 'FIXED' && Number(v.value) <= 0) ctx.addIssue({ code: 'custom', path: ['value'], message: 'A fixed discount must be more than 0' })
    if (v.startDate && v.endDate && v.endDate < v.startDate)
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after the start date' })
    if (v.scope === 'PRODUCTS' && v.productIds.length === 0) ctx.addIssue({ code: 'custom', path: ['productIds'], message: 'Pick at least one product' })
  })
type FormValues = z.infer<typeof schema>

const toForm = (d?: DiscountDetail): FormValues => ({
  name: d?.name ?? '',
  code: d?.code ?? '',
  type: d?.type ?? 'PERCENT',
  value: d?.value ?? '',
  scope: d?.scope ?? 'SUBSCRIPTION',
  productIds: d?.products ?? [],
  customerIds: d?.customers ?? [],
  minPurchaseAmount: d?.minPurchaseAmount ?? '',
  minQuantity: d?.minQuantity?.toString() ?? '',
  startDate: d?.startDate ?? '',
  endDate: d?.endDate ?? '',
  usageLimit: d?.usageLimit?.toString() ?? '',
  isActive: d?.isActive ?? true,
})

function Segmented<T extends string>({ value, options, onChange, disabled }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex rounded-md border border-gray-300 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed',
            value === o.value ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const usageColumns: Column<DiscountUsage>[] = [
  { key: 'invoice', header: 'Invoice', render: (u) => u.invoice.number ?? `Draft #${u.invoice.id}` },
  { key: 'subscription', header: 'Subscription', render: (u) => u.subscription.number ?? `#${u.subscription.id}` },
  { key: 'amount', header: 'Discount', align: 'right', render: (u) => formatMoney(u.amount) },
  { key: 'createdAt', header: 'Date', render: (u) => formatDate(u.createdAt) },
]

export function DiscountFormPage() {
  const { id: idParam } = useParams()
  const id = idParam && idParam !== 'new' ? Number(idParam) : null
  const navigate = useNavigate()
  const toast = useToast()
  const isAdmin = useAuth().user?.role === 'ADMIN'
  const { data: discount, isLoading, isError, error } = useDiscount(id)
  const save = useSaveDiscount(id)
  const deactivate = useDeactivateDiscount()
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: toForm() })

  useEffect(() => {
    if (discount) reset(toForm(discount))
  }, [discount, reset])

  async function onSubmit(values: FormValues) {
    try {
      const saved = await save.mutateAsync({
        ...values,
        productIds: values.scope === 'PRODUCTS' ? values.productIds.map((p) => p.id) : [],
        customerIds: values.customerIds.map((c) => c.id),
      })
      toast.success(id ? 'Discount updated' : 'Discount created')
      if (!id) navigate(`/app/discounts/${saved.id}`, { replace: true })
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not save discount'))
    }
  }

  async function onDeactivate() {
    if (!id) return
    try {
      await deactivate.mutateAsync(id)
      toast.success('Discount deactivated')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not deactivate discount'))
    }
    setConfirmDeactivate(false)
  }

  if (id && isLoading) return <PageSpinner />
  if (id && isError) return <p className="py-10 text-center text-sm text-danger-600">{errorMessage(error, 'Discount not found')}</p>

  const values = watch()
  const summary = discountSummary({ ...values, products: values.productIds, customers: values.customerIds })

  return (
    <>
      <PageHeader
        title={id ? discount?.name : 'New discount'}
        breadcrumbs={[{ label: 'Discounts', to: '/app/discounts' }, { label: id ? (discount?.name ?? '') : 'New' }]}
        actions={
          isAdmin ? (
            <>
              {discount?.isActive && (
                <Button variant="secondary" onClick={() => setConfirmDeactivate(true)}>
                  <Ban className="h-4 w-4" /> Deactivate
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/app/discounts')}>
                Cancel
              </Button>
              <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting} disabled={!!id && !isDirty}>
                {id ? 'Save changes' : 'Create discount'}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => navigate('/app/discounts')}>
              Back
            </Button>
          )
        }
      />

      {discount && (
        <div className="mb-4 flex items-center gap-3 text-sm text-gray-600">
          <Badge tone={STATUS_BADGE[discount.status].tone}>{STATUS_BADGE[discount.status].label}</Badge>
          <span>
            Used {discount.timesUsed}
            {discount.usageLimit !== null && ` of ${discount.usageLimit}`} time{discount.timesUsed === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <fieldset disabled={!isAdmin} className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Discount" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
                <Input id="name" autoFocus={!id} placeholder="Big team 10%" invalid={!!errors.name} {...register('name')} />
              </FormField>
              <FormField label="Code" htmlFor="code" error={errors.code?.message} hint="Optional reference, e.g. TEAM10">
                <Input id="code" className="uppercase" invalid={!!errors.code} {...register('code')} />
              </FormField>
              <FormField label="Type" required>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Segmented
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!isAdmin}
                      options={[
                        { value: 'PERCENT', label: '% Percentage' },
                        { value: 'FIXED', label: '₹ Fixed' },
                      ]}
                    />
                  )}
                />
              </FormField>
              <FormField label={values.type === 'PERCENT' ? 'Value (%)' : 'Value (₹)'} htmlFor="value" error={errors.value?.message} required>
                <Input id="value" inputMode="decimal" invalid={!!errors.value} {...register('value')} />
              </FormField>
              <FormField label="Applies to" required className="sm:col-span-2">
                <Controller
                  control={control}
                  name="scope"
                  render={({ field }) => (
                    <Segmented
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!isAdmin}
                      options={[
                        { value: 'SUBSCRIPTION', label: 'Whole subscription' },
                        { value: 'PRODUCTS', label: 'Specific products' },
                      ]}
                    />
                  )}
                />
              </FormField>
              {values.scope === 'PRODUCTS' && (
                <FormField label="Products" htmlFor="products" error={errors.productIds?.message} required className="sm:col-span-2">
                  <Controller
                    control={control}
                    name="productIds"
                    render={({ field }) => (
                      <ProductMultiSelect id="products" value={field.value} onChange={field.onChange} invalid={!!errors.productIds} disabled={!isAdmin} />
                    )}
                  />
                </FormField>
              )}
            </CardBody>
          </Card>

          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader title="Conditions" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <FormField label="Minimum purchase (₹)" htmlFor="minPurchaseAmount" error={errors.minPurchaseAmount?.message} hint="Leave empty for no minimum">
                  <Input id="minPurchaseAmount" inputMode="decimal" invalid={!!errors.minPurchaseAmount} {...register('minPurchaseAmount')} />
                </FormField>
                <FormField label="Minimum quantity" htmlFor="minQuantity" error={errors.minQuantity?.message} hint="Seats or units">
                  <Input id="minQuantity" inputMode="numeric" invalid={!!errors.minQuantity} {...register('minQuantity')} />
                </FormField>
                <FormField label="Only for customers" htmlFor="customer-add" error={errors.customerIds?.message} hint="Leave empty for everyone" className="sm:col-span-2">
                  <Controller
                    control={control}
                    name="customerIds"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <CustomerPicker
                          id="customer-add"
                          value={null}
                          disabled={!isAdmin}
                          placeholder="Add a customer…"
                          onChange={(c) => c && !field.value.some((x) => x.id === c.id) && field.onChange([...field.value, { id: c.id, name: c.name }])}
                        />
                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {field.value.map((c) => (
                              <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                                {c.name}
                                {isAdmin && (
                                  <button type="button" aria-label={`Remove ${c.name}`} onClick={() => field.onChange(field.value.filter((x) => x.id !== c.id))}>
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  />
                </FormField>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Validity and limits" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <FormField label="Start date" htmlFor="startDate" error={errors.startDate?.message} required>
                  <Input id="startDate" type="date" invalid={!!errors.startDate} {...register('startDate')} />
                </FormField>
                <FormField label="End date" htmlFor="endDate" error={errors.endDate?.message} required>
                  <Input id="endDate" type="date" invalid={!!errors.endDate} {...register('endDate')} />
                </FormField>
                <FormField label="Usage limit" htmlFor="usageLimit" error={errors.usageLimit?.message} hint="Invoices it can apply to. Empty = unlimited">
                  <Input id="usageLimit" inputMode="numeric" invalid={!!errors.usageLimit} {...register('usageLimit')} />
                </FormField>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <div className="flex items-end pb-2">
                      <Switch id="isActive" checked={field.value} onChange={field.onChange} disabled={!isAdmin} label="Active" />
                    </div>
                  )}
                />
              </CardBody>
            </Card>
          </div>
        </fieldset>
        <button type="submit" hidden />
      </form>

      {summary && (
        <p className="mt-5 rounded-md bg-primary-50 px-4 py-3 text-sm text-primary-700">
          <span className="font-medium">Summary: </span>
          {summary}
        </p>
      )}

      {discount && (
        <Card className="mt-5">
          <CardHeader title="Recent uses" />
          <DataTable columns={usageColumns} rows={discount.usages} rowKey={(u) => u.id} emptyTitle="Not used on any invoice yet" />
        </Card>
      )}

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate discount?"
        message="It stops applying to new invoices. Invoices that already have it keep their discount."
        confirmLabel="Deactivate"
        loading={deactivate.isPending}
        onConfirm={onDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </>
  )
}
