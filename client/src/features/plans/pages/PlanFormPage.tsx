import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, FormField, Input, PageHeader, PageSpinner, Select, Switch, useToast } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { formatMoney, formatPeriod } from '@/lib/format'
import { taxes } from '@/features/taxes/api'
import { RemoveDialog } from '@/features/taxes/components/RemoveDialog'
import { useDeletePlan, usePlan, useSavePlan, type Plan, type PlanInput } from '../api'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
    price: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price (up to 2 decimals)'),
    billingPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    billingInterval: z.coerce.number().int('Use a whole number').min(1, 'Bill every 1 to 12 periods').max(12, 'Bill every 1 to 12 periods'),
    minQuantity: z.coerce.number().int('Use a whole number').min(1, 'Minimum quantity is at least 1'),
    startDate: z.string(),
    endDate: z.string(),
    autoClose: z.boolean(),
    closable: z.boolean(),
    pausable: z.boolean(),
    renewable: z.boolean(),
    isActive: z.boolean(),
    taxIds: z.array(z.number()),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End date must be on or after the start date',
  })
type FormValues = z.infer<typeof schema>

const PERIOD_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
]

const BEHAVIOUR: { name: 'autoClose' | 'closable' | 'pausable' | 'renewable'; label: string; help: string }[] = [
  { name: 'autoClose', label: 'Auto-close', help: 'Subscriptions close by themselves on their expiry date.' },
  { name: 'closable', label: 'Closable', help: 'Subscriptions can be closed before they expire.' },
  { name: 'pausable', label: 'Pausable', help: 'Billing can be paused and resumed later.' },
  { name: 'renewable', label: 'Renewable', help: 'A new subscription can be created when this one ends.' },
]

const toForm = (p?: Plan): FormValues => ({
  name: p?.name ?? '',
  price: p?.price ?? '',
  billingPeriod: p?.billingPeriod ?? 'MONTHLY',
  billingInterval: p?.billingInterval ?? 1,
  minQuantity: p?.minQuantity ?? 1,
  startDate: p?.startDate ?? '',
  endDate: p?.endDate ?? '',
  autoClose: p?.autoClose ?? false,
  closable: p?.closable ?? true,
  pausable: p?.pausable ?? false,
  renewable: p?.renewable ?? true,
  isActive: p?.isActive ?? true,
  taxIds: p?.taxIds ?? [],
})

export function PlanFormPage() {
  const { id: idParam } = useParams()
  const id = idParam && idParam !== 'new' ? Number(idParam) : null
  const navigate = useNavigate()
  const toast = useToast()
  const isAdmin = useAuth().user?.role === 'ADMIN'
  const { data: plan, isLoading, isError, error } = usePlan(id)
  const { data: taxOptions = [] } = taxes.useOptions()
  const save = useSavePlan(id)
  const remove = useDeletePlan()
  const [removing, setRemoving] = useState(false)

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
    if (plan) reset(toForm(plan))
  }, [plan, reset])

  async function onSubmit(values: FormValues) {
    try {
      const saved = await save.mutateAsync(values as PlanInput)
      toast.success(id ? 'Plan updated' : 'Plan created')
      if (!id) navigate(`/app/plans/${saved.id}`, { replace: true })
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not save plan'))
    }
  }

  if (id && isLoading) return <PageSpinner />
  if (id && isError) return <p className="py-10 text-center text-sm text-danger-600">{errorMessage(error, 'Plan not found')}</p>

  // Archived taxes still show when the plan already uses them, so saving doesn't silently drop them.
  const selectableTaxes = [...taxOptions, ...(plan?.taxes ?? []).filter((t) => !taxOptions.some((o) => o.id === t.id))]
  const price = watch('price')
  const period = watch('billingPeriod')
  const interval = Number(watch('billingInterval')) || 1

  return (
    <>
      <PageHeader
        title={id ? plan?.name : 'New plan'}
        breadcrumbs={[{ label: 'Plans', to: '/app/plans' }, { label: id ? (plan?.name ?? '') : 'New' }]}
        actions={
          isAdmin ? (
            <>
              {id && (
                <Button variant="secondary" onClick={() => setRemoving(true)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/app/plans')}>
                Cancel
              </Button>
              <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting} disabled={!!id && !isDirty}>
                {id ? 'Save changes' : 'Create plan'}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => navigate('/app/plans')}>
              Back
            </Button>
          )
        }
      />

      {plan && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          {plan.isActive ? <Badge tone="success">Active</Badge> : <Badge>Archived</Badge>}
          <span>
            {plan.activeSubscriptions} active subscription{plan.activeSubscriptions === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <fieldset disabled={!isAdmin} className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Pricing" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" htmlFor="name" error={errors.name?.message} required className="sm:col-span-2">
                <Input id="name" autoFocus={!id} placeholder="Pro Monthly" invalid={!!errors.name} {...register('name')} />
              </FormField>
              <FormField
                label="Price (₹)"
                htmlFor="price"
                error={errors.price?.message}
                hint={/^\d+(\.\d{1,2})?$/.test(price) && `${formatMoney(price)} / ${formatPeriod(period, interval)}`}
                required
              >
                <Input id="price" inputMode="decimal" invalid={!!errors.price} {...register('price')} />
              </FormField>
              <FormField label="Minimum quantity" htmlFor="minQuantity" error={errors.minQuantity?.message} hint="Seats per subscription" required>
                <Input id="minQuantity" type="number" min={1} invalid={!!errors.minQuantity} {...register('minQuantity')} />
              </FormField>
              <FormField label="Billing period" htmlFor="billingPeriod" required>
                <Select id="billingPeriod" options={PERIOD_OPTIONS} {...register('billingPeriod')} />
              </FormField>
              <FormField label="Bill every" htmlFor="billingInterval" error={errors.billingInterval?.message} hint="e.g. 3 + Monthly = quarterly" required>
                <Input id="billingInterval" type="number" min={1} max={12} invalid={!!errors.billingInterval} {...register('billingInterval')} />
              </FormField>
              <FormField label="Taxes" className="sm:col-span-2" error={errors.taxIds?.message}>
                <Controller
                  control={control}
                  name="taxIds"
                  render={({ field }) =>
                    selectableTaxes.length ? (
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {selectableTaxes.map((t) => (
                          <Checkbox
                            key={t.id}
                            id={`tax-${t.id}`}
                            label={t.name}
                            checked={field.value.includes(t.id)}
                            onChange={(e) =>
                              field.onChange(e.target.checked ? [...field.value, t.id] : field.value.filter((v) => v !== t.id))
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No active taxes. Add them under Configuration → Taxes.</p>
                    )
                  }
                />
              </FormField>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader title="Availability" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <FormField label="Available from" htmlFor="startDate" error={errors.startDate?.message} hint="Leave empty for no start limit">
                  <Input id="startDate" type="date" invalid={!!errors.startDate} {...register('startDate')} />
                </FormField>
                <FormField label="Available until" htmlFor="endDate" error={errors.endDate?.message} hint="Leave empty for no end date">
                  <Input id="endDate" type="date" invalid={!!errors.endDate} {...register('endDate')} />
                </FormField>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <div className="sm:col-span-2">
                      <Switch id="isActive" checked={field.value} onChange={field.onChange} disabled={!isAdmin} label="Active" />
                      <p className="mt-1 text-xs text-gray-500">Archived plans can't be picked for new subscriptions.</p>
                    </div>
                  )}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Behaviour" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                {BEHAVIOUR.map((b) => (
                  <Controller
                    key={b.name}
                    control={control}
                    name={b.name}
                    render={({ field }) => (
                      <div>
                        <Switch id={b.name} checked={field.value} onChange={field.onChange} disabled={!isAdmin} label={b.label} />
                        <p className="mt-1 text-xs text-gray-500">{b.help}</p>
                      </div>
                    )}
                  />
                ))}
              </CardBody>
            </Card>
          </div>
        </fieldset>
        <button type="submit" hidden />
      </form>

      <RemoveDialog
        item={removing && plan ? { id: plan.id, name: plan.name, usageCount: 0, isActive: plan.isActive } : null}
        what="plan"
        onDelete={async (planId) => {
          await remove.mutateAsync(planId)
          navigate('/app/plans', { replace: true })
        }}
        onDeactivate={() => save.mutateAsync({ isActive: false })}
        onClose={() => setRemoving(false)}
      />
    </>
  )
}
