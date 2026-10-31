import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, FormField, Input, KpiCard, PageHeader, PageSpinner, useToast } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { formatMoney } from '@/lib/format'
import { emailSchema } from '@/lib/validators'
import { useCustomer, useDeleteCustomer, useSaveCustomer, type Customer, type CustomerInput } from '../api'

const optional = (schema: z.ZodString) => schema.or(z.literal(''))

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  email: emailSchema,
  phone: optional(z.string().trim().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number')),
  companyName: optional(z.string().trim().max(120, 'Company name is too long')),
  taxId: optional(
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN'),
  ),
  street: optional(z.string().trim().max(200)),
  city: optional(z.string().trim().max(80)),
  state: optional(z.string().trim().max(80)),
  zip: optional(z.string().trim().regex(/^[A-Za-z0-9 -]{3,10}$/, 'Enter a valid PIN / ZIP code')),
  country: optional(z.string().trim().max(80)),
})
type FormValues = z.infer<typeof schema>

const FIELDS: (keyof FormValues)[] = ['name', 'email', 'phone', 'companyName', 'taxId', 'street', 'city', 'state', 'zip', 'country']

const toForm = (c?: Customer): FormValues =>
  Object.fromEntries(FIELDS.map((f) => [f, c?.[f] ?? (f === 'country' && !c ? 'India' : '')])) as FormValues

export function CustomerFormPage() {
  const { id: idParam } = useParams()
  const id = idParam && idParam !== 'new' ? Number(idParam) : null
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { data: customer, isLoading, isError, error } = useCustomer(id)
  const save = useSaveCustomer(id)
  const remove = useDeleteCustomer()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: toForm() })

  useEffect(() => {
    if (customer) reset(toForm(customer))
  }, [customer, reset])

  async function onSubmit(values: FormValues) {
    try {
      const saved = await save.mutateAsync(values as CustomerInput)
      toast.success(id ? 'Customer updated' : 'Customer created')
      if (!id) navigate(`/app/customers/${saved.id}`, { replace: true })
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not save customer'))
    }
  }

  async function onDelete() {
    if (!id) return
    try {
      await remove.mutateAsync(id)
      toast.success('Customer deleted')
      navigate('/app/customers', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete customer'))
      setConfirmDelete(false)
    }
  }

  if (id && isLoading) return <PageSpinner />
  if (id && isError) return <p className="py-10 text-center text-sm text-danger-600">{errorMessage(error, 'Customer not found')}</p>

  const field = (name: keyof FormValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, required = false) => (
    <FormField label={label} htmlFor={name} error={errors[name]?.message} required={required}>
      <Input id={name} invalid={!!errors[name]} {...props} {...register(name)} />
    </FormField>
  )

  return (
    <>
      <PageHeader
        title={id ? customer?.name : 'New customer'}
        breadcrumbs={[{ label: 'Customers', to: '/app/customers' }, { label: id ? (customer?.name ?? '') : 'New' }]}
        actions={
          <>
            {id && user?.role === 'ADMIN' && (
              <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/app/customers')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting} disabled={!!id && !isDirty}>
              {id ? 'Save changes' : 'Create customer'}
            </Button>
          </>
        }
      />

      {customer && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <KpiCard label="Active subscriptions" value={customer.stats.activeSubscriptions} />
          <KpiCard label="Open invoices" value={customer.stats.openInvoices} />
          <KpiCard
            label="Outstanding"
            value={formatMoney(customer.stats.outstandingAmount)}
            tone={Number(customer.stats.outstandingAmount) > 0 ? 'warning' : undefined}
          />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Contact"
            actions={customer && (customer.portalUser ? <Badge tone="success">Portal login</Badge> : <Badge>No portal login</Badge>)}
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            {field('name', 'Name', { autoFocus: !id }, true)}
            {field('companyName', 'Company')}
            {field('email', 'Email', { type: 'email' }, true)}
            {field('phone', 'Phone', { type: 'tel', placeholder: '+91 98765 43210' })}
            {field('taxId', 'GSTIN', { placeholder: '22AAAAA0000A1Z5' })}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Billing address" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field('street', 'Street')}</div>
            {field('city', 'City')}
            {field('state', 'State')}
            {field('zip', 'PIN / ZIP')}
            {field('country', 'Country')}
          </CardBody>
        </Card>
        <button type="submit" hidden />
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete customer?"
        message="This can't be undone. Customers with subscriptions, invoices or a portal login can't be deleted."
        confirmLabel="Delete"
        tone="danger"
        loading={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
