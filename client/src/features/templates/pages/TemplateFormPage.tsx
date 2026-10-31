import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { FilePlus2, Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, ConfirmDialog, FormField, Input, PageHeader, PageSpinner, Select, Textarea, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/lib/api'
import { formatMoney, formatPeriod } from '@/lib/format'
import { usePlanOptions } from '@/features/plans/api'
import { VariantPicker } from '@/features/products/components/VariantPicker'
import type { VariantOption } from '@/features/products/api'
import { useDeleteTemplate, useSaveTemplate, useTemplate, type Template } from '../api'

const variantOption = z.object({
  variantId: z.number(),
  label: z.string(),
  price: z.string(),
  productId: z.number(),
  taxIds: z.array(z.number()),
})

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  validityDays: z.coerce
    .number({ invalid_type_error: 'Enter the number of days' })
    .int('Use whole days')
    .min(1, 'Validity must be between 1 and 365 days')
    .max(365, 'Validity must be between 1 and 365 days'),
  planId: z.coerce.number({ invalid_type_error: 'Choose a plan' }).int().positive('Choose a plan'),
  notes: z.string().max(1000, 'Notes are too long'),
  lines: z
    .array(
      z.object({
        variant: variantOption.nullable(),
        quantity: z.coerce.number().int('Use a whole number').min(1, 'At least 1'),
        description: z.string().max(200, 'Too long'),
      }),
    )
    // Checked here rather than with .refine on `variant`, which would narrow the type and reject empty new rows.
    .superRefine((lines, ctx) => {
      const seen = new Set<number>()
      lines.forEach((l, i) => {
        if (!l.variant) {
          ctx.addIssue({ code: 'custom', path: [i, 'variant'], message: 'Choose a product' })
          return
        }
        if (seen.has(l.variant.variantId)) ctx.addIssue({ code: 'custom', path: [i, 'variant'], message: 'Already on another line' })
        seen.add(l.variant.variantId)
      })
    }),
})
type FormValues = z.infer<typeof schema>

const emptyLine = { variant: null, quantity: 1, description: '' }

const toForm = (t?: Template): FormValues => ({
  name: t?.name ?? '',
  validityDays: t?.validityDays ?? 30,
  planId: t?.planId ?? 0,
  notes: t?.notes ?? '',
  lines:
    t?.lines.map((l) => ({
      variant: { variantId: l.variantId, label: l.label, price: l.price, productId: l.productId, taxIds: l.taxIds },
      quantity: l.quantity,
      description: l.description ?? '',
    })) ?? [],
})

export function TemplateFormPage() {
  const { id: idParam } = useParams()
  const id = idParam && idParam !== 'new' ? Number(idParam) : null
  const navigate = useNavigate()
  const toast = useToast()
  const { data: template, isLoading, isError, error } = useTemplate(id)
  const { data: planOptions = [] } = usePlanOptions()
  const save = useSaveTemplate(id)
  const remove = useDeleteTemplate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: toForm() })
  const { fields, append, remove: removeLine } = useFieldArray({ control, name: 'lines' })

  useEffect(() => {
    if (template) reset(toForm(template))
  }, [template, reset])

  async function onSubmit(values: FormValues) {
    try {
      const saved = await save.mutateAsync({
        ...values,
        lines: values.lines.map((l) => ({ variantId: l.variant!.variantId, quantity: l.quantity, description: l.description })),
      })
      toast.success(id ? 'Template updated' : 'Template created')
      if (!id) navigate(`/app/templates/${saved.id}`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        // The API names the row field `variantId`; the form keeps the picked option under `variant`.
        for (const [key, message] of Object.entries(err.fields)) {
          setError(key.replace(/\.variantId$/, '.variant') as keyof FormValues, { type: 'server', message })
        }
      } else toast.error(errorMessage(err, 'Could not save template'))
    }
  }

  async function onDelete() {
    if (!id) return
    try {
      await remove.mutateAsync(id)
      toast.success('Template deleted')
      navigate('/app/templates', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete template'))
      setConfirmDelete(false)
    }
  }

  if (id && isLoading) return <PageSpinner />
  if (id && isError) return <p className="py-10 text-center text-sm text-danger-600">{errorMessage(error, 'Template not found')}</p>

  // Keep the template's own plan selectable even if it has since been archived.
  const plans = [...planOptions]
  if (template && !plans.some((p) => p.id === template.plan.id)) plans.push({ ...template.plan, taxes: [], taxIds: [] })
  const planId = Number(watch('planId'))
  const plan = plans.find((p) => p.id === planId)
  const lines = watch('lines')

  const planAmount = plan ? Number(plan.price) * plan.minQuantity : 0
  const linesAmount = lines.reduce((s, l) => s + (l.variant ? Number(l.variant.price) * (Number(l.quantity) || 0) : 0), 0)

  return (
    <>
      <PageHeader
        title={id ? template?.name : 'New quotation template'}
        breadcrumbs={[{ label: 'Quotation templates', to: '/app/templates' }, { label: id ? (template?.name ?? '') : 'New' }]}
        actions={
          <>
            {id && (
              <>
                <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
                <Button
                  variant="secondary"
                  disabled={isDirty || !template?.plan.isActive}
                  title={isDirty ? 'Save your changes first' : undefined}
                  onClick={() => navigate(`/app/subscriptions/new?templateId=${id}`)}
                >
                  <FilePlus2 className="h-4 w-4" /> Use template
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => navigate('/app/templates')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting} disabled={!!id && !isDirty}>
              {id ? 'Save changes' : 'Create template'}
            </Button>
          </>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Card>
          <CardHeader title="Template" />
          <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Name" htmlFor="name" error={errors.name?.message} required className="lg:col-span-2">
              <Input id="name" autoFocus={!id} placeholder="CRM starter pack" invalid={!!errors.name} {...register('name')} />
            </FormField>
            <FormField label="Valid for (days)" htmlFor="validityDays" error={errors.validityDays?.message} hint="How long the quotation stays open" required>
              <Input id="validityDays" type="number" min={1} max={365} invalid={!!errors.validityDays} {...register('validityDays')} />
            </FormField>
            <FormField label="Plan" htmlFor="planId" error={errors.planId?.message} required>
              <Select
                id="planId"
                placeholder="Choose a plan"
                invalid={!!errors.planId}
                options={plans.map((p) => ({
                  value: p.id,
                  label: `${p.name} · ${formatMoney(p.price)} / ${formatPeriod(p.billingPeriod, p.billingInterval)}`,
                }))}
                {...register('planId')}
              />
            </FormField>
            <FormField label="Notes" htmlFor="notes" error={errors.notes?.message} className="sm:col-span-2 lg:col-span-4">
              <Textarea id="notes" rows={2} invalid={!!errors.notes} {...register('notes')} />
            </FormField>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Add-on lines"
            actions={
              <Button size="sm" variant="secondary" onClick={() => append({ ...emptyLine })}>
                <Plus className="h-4 w-4" /> Add line
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {fields.length === 0 ? (
              <p className="rounded-md bg-warning-50 px-3 py-2 text-sm text-warning-700">
                No add-on lines: subscriptions from this template will only bill the plan. Add lines if that's not intended.
              </p>
            ) : (
              <>
                <div className="hidden grid-cols-[1fr_6rem_1fr_7rem_2.25rem] gap-2 text-xs font-medium tracking-wide text-gray-500 uppercase md:grid">
                  <span>Product</span>
                  <span>Qty</span>
                  <span>Description</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>
                {fields.map((row, i) => {
                  const rowErrors = errors.lines?.[i]
                  const line = lines[i]
                  const amount = line?.variant ? Number(line.variant.price) * (Number(line.quantity) || 0) : 0
                  return (
                    <div key={row.id} className="grid items-start gap-2 md:grid-cols-[1fr_6rem_1fr_7rem_2.25rem]">
                      <div>
                        <Controller
                          control={control}
                          name={`lines.${i}.variant`}
                          render={({ field }) => (
                            <VariantPicker value={field.value as VariantOption | null} onChange={field.onChange} invalid={!!rowErrors?.variant} />
                          )}
                        />
                        {rowErrors?.variant && <p className="mt-1 text-xs text-danger-600">{rowErrors.variant.message}</p>}
                      </div>
                      <div>
                        <Input aria-label={`Line ${i + 1} quantity`} type="number" min={1} invalid={!!rowErrors?.quantity} {...register(`lines.${i}.quantity`)} />
                        {rowErrors?.quantity && <p className="mt-1 text-xs text-danger-600">{rowErrors.quantity.message}</p>}
                      </div>
                      <Input aria-label={`Line ${i + 1} description`} placeholder="Optional" {...register(`lines.${i}.description`)} />
                      <div className="flex h-9 items-center justify-end text-sm text-gray-700">{formatMoney(amount)}</div>
                      <Button variant="ghost" size="sm" className="h-9" onClick={() => removeLine(i)} aria-label={`Remove line ${i + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </>
            )}

            <div className="mt-2 border-t border-gray-200 pt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>
                  Plan{plan ? ` (${plan.name} × ${plan.minQuantity} seat${plan.minQuantity === 1 ? '' : 's'})` : ''}
                </span>
                <span>{formatMoney(planAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Add-ons</span>
                <span>{formatMoney(linesAmount)}</span>
              </div>
              <div className="mt-1 flex justify-between font-medium text-gray-900">
                <span>Estimated subtotal per period (before tax)</span>
                <span>{formatMoney(planAmount + linesAmount)}</span>
              </div>
            </div>
          </CardBody>
        </Card>
        <button type="submit" hidden />
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete template?"
        message="Subscriptions already created from it keep their lines."
        confirmLabel="Delete"
        tone="danger"
        loading={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
