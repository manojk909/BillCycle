import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, Plus, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  PageHeader,
  PageSpinner,
  Select,
  Tabs,
  Textarea,
  useToast,
  type Column,
} from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { formatMoney } from '@/lib/format'
import { taxes } from '@/features/taxes/api'
import { useDeleteVariant, useProduct, useSaveProduct, useSetProductActive, type Product, type ProductInput, type Variant } from '../api'
import { AddVariantModal } from '../components/AddVariantModal'

const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount (up to 2 decimals)')

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  type: z.enum(['SERVICE', 'GOODS']),
  salesPrice: money,
  costPrice: money.or(z.literal('')),
  notes: z.string().max(1000, 'Notes are too long'),
  taxIds: z.array(z.number()),
})
type FormValues = z.infer<typeof schema>

const TYPE_OPTIONS = [
  { value: 'SERVICE', label: 'Service (software, support)' },
  { value: 'GOODS', label: 'Goods (physical item)' },
]

const toForm = (p?: Product): FormValues => ({
  name: p?.name ?? '',
  type: p?.type ?? 'SERVICE',
  salesPrice: p?.salesPrice ?? '',
  costPrice: p?.costPrice ?? '',
  notes: p?.notes ?? '',
  taxIds: p?.taxIds ?? [],
})

export function ProductFormPage() {
  const { id: idParam } = useParams()
  const id = idParam && idParam !== 'new' ? Number(idParam) : null
  const navigate = useNavigate()
  const toast = useToast()
  const isAdmin = useAuth().user?.role === 'ADMIN'
  const { data: product, isLoading, isError, error } = useProduct(id)
  const { data: taxOptions = [] } = taxes.useOptions()
  const save = useSaveProduct(id)
  const setActive = useSetProductActive()
  const deleteVariant = useDeleteVariant(id ?? 0)
  const [tab, setTab] = useState('general')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [addingVariant, setAddingVariant] = useState(false)
  const [removingVariant, setRemovingVariant] = useState<Variant | null>(null)

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
    if (product) reset(toForm(product))
  }, [product, reset])

  async function onSubmit(values: FormValues) {
    const input: ProductInput = { ...values, costPrice: isAdmin ? values.costPrice || '0' : undefined }
    try {
      const saved = await save.mutateAsync(input)
      toast.success(id ? 'Product updated' : 'Product created')
      if (saved.warning) toast.error(saved.warning)
      if (!id) navigate(`/app/products/${saved.id}`, { replace: true })
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not save product'))
    }
  }

  async function onArchiveToggle() {
    if (!product) return
    try {
      await setActive.mutateAsync({ id: product.id, isActive: !product.isActive })
      toast.success(product.isActive ? 'Product archived' : 'Product restored')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update product'))
    }
    setConfirmArchive(false)
  }

  async function onDeleteVariant() {
    if (!removingVariant) return
    try {
      await deleteVariant.mutateAsync(removingVariant.id)
      toast.success('Variant deleted')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete variant'))
    }
    setRemovingVariant(null)
  }

  if (id && isLoading) return <PageSpinner />
  if (id && isError) return <p className="py-10 text-center text-sm text-danger-600">{errorMessage(error, 'Product not found')}</p>

  const sales = Number(watch('salesPrice'))
  const cost = Number(watch('costPrice') || 0)
  const margin = sales > 0 && Number.isFinite(cost) ? ((sales - cost) / sales) * 100 : null
  // Archived taxes stay listed when the product already has them, so saving doesn't silently drop them.
  const selectableTaxes = [...taxOptions, ...(product?.taxes ?? []).filter((t) => !taxOptions.some((o) => o.id === t.id))]

  const variantColumns: Column<Variant>[] = [
    {
      key: 'values',
      header: 'Values',
      render: (v) =>
        v.isDefault ? (
          <span className="text-gray-500">Default (no attributes)</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {v.values.map((x) => (
              <Badge key={x.id} tone="primary">
                {x.attributeName}: {x.name} (+{formatMoney(x.extraPrice)})
              </Badge>
            ))}
          </div>
        ),
    },
    { key: 'sku', header: 'SKU', render: (v) => v.sku ?? '—' },
    { key: 'price', header: 'Price', align: 'right', render: (v) => <span className="font-medium">{formatMoney(v.price)}</span> },
    { key: 'usageCount', header: 'Used on', align: 'right', render: (v) => (v.usageCount ? `${v.usageCount} line${v.usageCount === 1 ? '' : 's'}` : '—') },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (v: Variant) =>
              !v.isDefault && (
                <Button variant="ghost" size="sm" onClick={() => setRemovingVariant(v)} aria-label={`Delete ${v.label}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title={id ? product?.name : 'New product'}
        breadcrumbs={[{ label: 'Products', to: '/app/products' }, { label: id ? (product?.name ?? '') : 'New' }]}
        actions={
          isAdmin ? (
            <>
              {product && (
                <Button variant="secondary" onClick={() => setConfirmArchive(true)}>
                  {product.isActive ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                  {product.isActive ? 'Archive' : 'Restore'}
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/app/products')}>
                Cancel
              </Button>
              {tab === 'general' && (
                <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting} disabled={!!id && !isDirty}>
                  {id ? 'Save changes' : 'Create product'}
                </Button>
              )}
            </>
          ) : (
            <Button variant="secondary" onClick={() => navigate('/app/products')}>
              Back
            </Button>
          )
        }
      />

      {product && !product.isActive && (
        <p className="mb-4 rounded-md bg-warning-50 px-4 py-2 text-sm text-warning-700">
          This product is archived and can't be added to new subscriptions.
        </p>
      )}

      {id && (
        <Tabs
          tabs={[
            { key: 'general', label: 'General' },
            { key: 'variants', label: 'Variants', count: product?.variants.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}

      {tab === 'general' && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset disabled={!isAdmin} className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Product" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" htmlFor="name" error={errors.name?.message} required className="sm:col-span-2">
                  <Input id="name" autoFocus={!id} placeholder="Brightloop CRM" invalid={!!errors.name} {...register('name')} />
                </FormField>
                <FormField label="Type" htmlFor="type" required className="sm:col-span-2">
                  <Select id="type" options={TYPE_OPTIONS} {...register('type')} />
                </FormField>
                <FormField label="Notes" htmlFor="notes" error={errors.notes?.message} className="sm:col-span-2">
                  <Textarea id="notes" invalid={!!errors.notes} {...register('notes')} />
                </FormField>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Pricing" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <FormField label="Sales price (₹)" htmlFor="salesPrice" error={errors.salesPrice?.message} hint="Price of the default variant" required>
                  <Input id="salesPrice" inputMode="decimal" invalid={!!errors.salesPrice} {...register('salesPrice')} />
                </FormField>
                {isAdmin && (
                  <FormField
                    label="Cost price (₹)"
                    htmlFor="costPrice"
                    error={errors.costPrice?.message}
                    hint={margin !== null && `Margin ${margin.toFixed(1)}%`}
                  >
                    <Input id="costPrice" inputMode="decimal" invalid={!!errors.costPrice} {...register('costPrice')} />
                  </FormField>
                )}
                <FormField label="Default taxes" className="sm:col-span-2" error={errors.taxIds?.message}>
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
                              onChange={(e) => field.onChange(e.target.checked ? [...field.value, t.id] : field.value.filter((v) => v !== t.id))}
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
          </fieldset>
          <button type="submit" hidden />
        </form>
      )}

      {tab === 'variants' && product && (
        <Card>
          <CardHeader
            title="Variants"
            actions={
              isAdmin && (
                <Button size="sm" onClick={() => setAddingVariant(true)}>
                  <Plus className="h-4 w-4" /> Add variant
                </Button>
              )
            }
          />
          <DataTable columns={variantColumns} rows={product.variants} rowKey={(v) => v.id} emptyTitle="No variants" />
        </Card>
      )}

      {product && <AddVariantModal open={addingVariant} product={product} onClose={() => setAddingVariant(false)} />}
      <ConfirmDialog
        open={confirmArchive}
        title={product?.isActive ? 'Archive product?' : 'Restore product?'}
        message={
          product?.isActive
            ? 'It will no longer be offered on new subscriptions. Existing subscriptions keep it.'
            : 'It will be available on new subscriptions again.'
        }
        confirmLabel={product?.isActive ? 'Archive' : 'Restore'}
        loading={setActive.isPending}
        onConfirm={onArchiveToggle}
        onCancel={() => setConfirmArchive(false)}
      />
      <ConfirmDialog
        open={!!removingVariant}
        title="Delete variant?"
        message={
          removingVariant?.usageCount
            ? `${removingVariant.label} is used on ${removingVariant.usageCount} line(s) and can't be deleted.`
            : `${removingVariant?.label} will be permanently deleted.`
        }
        confirmLabel={removingVariant?.usageCount ? 'OK' : 'Delete'}
        tone={removingVariant?.usageCount ? 'primary' : 'danger'}
        loading={deleteVariant.isPending}
        onConfirm={removingVariant?.usageCount ? () => setRemovingVariant(null) : onDeleteVariant}
        onCancel={() => setRemovingVariant(null)}
      />
    </>
  )
}
