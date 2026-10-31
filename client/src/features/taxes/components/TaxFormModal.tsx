import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Checkbox, FormField, Input, Modal, Select, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { formatMoney } from '@/lib/format'
import { previewTax, taxes, type Tax } from '../api'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(60, 'Name is too long'),
    type: z.enum(['PERCENT', 'FIXED']),
    rate: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,4})?$/, 'Enter a rate of 0 or more (up to 4 decimals)'),
    isActive: z.boolean(),
  })
  .refine((v) => v.type !== 'PERCENT' || Number(v.rate) <= 100, {
    path: ['rate'],
    message: 'A percentage tax must be between 0 and 100',
  })
type FormValues = z.infer<typeof schema>

const TYPE_OPTIONS = [
  { value: 'PERCENT', label: 'Percentage of the line amount' },
  { value: 'FIXED', label: 'Fixed amount per unit' },
]

export function TaxFormModal({ open, tax, onClose }: { open: boolean; tax: Tax | null; onClose: () => void }) {
  const toast = useToast()
  const save = taxes.useSave(tax?.id ?? null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' })

  useEffect(() => {
    if (open) reset(tax ? { name: tax.name, type: tax.type, rate: tax.rate, isActive: tax.isActive } : { name: '', type: 'PERCENT', rate: '', isActive: true })
  }, [open, tax, reset])

  async function onSubmit(values: FormValues) {
    try {
      await save.mutateAsync(values)
      toast.success(tax ? 'Tax updated' : 'Tax created')
      onClose()
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not save tax'))
    }
  }

  const type = watch('type') ?? 'PERCENT'
  const amount = previewTax(type, watch('rate') ?? '')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tax ? 'Edit tax' : 'New tax'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Name" htmlFor="tax-name" error={errors.name?.message} required>
          <Input id="tax-name" autoFocus placeholder="GST 18%" invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField label="Type" htmlFor="tax-type" required>
          <Select id="tax-type" options={TYPE_OPTIONS} {...register('type')} />
        </FormField>
        <FormField
          label={type === 'PERCENT' ? 'Rate (%)' : 'Amount per unit (₹)'}
          htmlFor="tax-rate"
          error={errors.rate?.message}
          hint={
            amount !== null &&
            (type === 'PERCENT'
              ? `On ${formatMoney(1000)} → ${formatMoney(amount)} tax`
              : `Each unit adds ${formatMoney(amount)} tax`)
          }
          required
        >
          <Input id="tax-rate" inputMode="decimal" invalid={!!errors.rate} {...register('rate')} />
        </FormField>
        <Checkbox id="tax-active" label="Active (available on new products and plans)" {...register('isActive')} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
