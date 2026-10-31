import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, FormField, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { formatMoney } from '@/lib/format'
import { usePaymentMethods, useRegisterPayment, type RegisterPaymentResult } from '../api'

type InvoiceSummary = { id: number; number: string | null; amountDue: string; customerName?: string }

/** Local calendar date as YYYY-MM-DD (toISOString would give the UTC date) */
const todayInput = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const makeSchema = (maxDue: number) =>
  z.object({
    methodId: z.coerce.number({ invalid_type_error: 'Choose a payment method' }).int().positive('Choose a payment method'),
    amount: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount (up to 2 decimals)')
      .refine((v) => Number(v) > 0, 'Amount must be greater than 0')
      .refine((v) => Number(v) <= maxDue, `Maximum is ${maxDue.toFixed(2)}`),
    date: z
      .string()
      .min(1, 'Choose the payment date')
      .refine((v) => v <= todayInput(), 'Cannot be in the future'),
    note: z.string().trim().max(500, 'Note is too long').optional(),
  })
type FormValues = z.infer<ReturnType<typeof makeSchema>>

/**
 * "Register payment" dialog for one invoice. Used on the invoice form (SK7):
 *   <RegisterPaymentModal invoice={{ id, number, amountDue, customerName }} open={open} onClose={() => setOpen(false)} />
 */
export function RegisterPaymentModal({
  invoice,
  open,
  onClose,
  onPaid,
}: {
  invoice: InvoiceSummary
  open: boolean
  onClose: () => void
  onPaid?: (result: RegisterPaymentResult) => void
}) {
  const toast = useToast()
  const { data: methods = [] } = usePaymentMethods()
  const register$ = useRegisterPayment(invoice.id)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(makeSchema(Number(invoice.amountDue))), mode: 'onBlur' })

  useEffect(() => {
    if (open) reset({ methodId: undefined, amount: Number(invoice.amountDue).toFixed(2), date: todayInput(), note: '' })
  }, [open, invoice.amountDue, reset])

  async function onSubmit(values: FormValues) {
    try {
      const result = await register$.mutateAsync({ ...values, note: values.note || undefined })
      toast.success(
        result.invoice.state === 'PAID'
          ? `Invoice ${invoice.number ?? ''} is now fully paid`
          : `Payment recorded. ${formatMoney(result.invoice.amountDue)} still due`,
      )
      onPaid?.(result)
      onClose()
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not record payment'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Register payment${invoice.number ? ` · ${invoice.number}` : ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Record payment
          </Button>
        </>
      }
    >
      <p className="mb-4 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
        {invoice.customerName && <span className="font-medium text-gray-900">{invoice.customerName} · </span>}
        Amount due: <span className="font-semibold text-gray-900">{formatMoney(invoice.amountDue)}</span>
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Method" htmlFor="pay-method" error={errors.methodId?.message} required>
          <Select
            id="pay-method"
            placeholder="Choose…"
            invalid={!!errors.methodId}
            options={methods.map((m) => ({ value: m.id, label: m.name }))}
            {...register('methodId')}
          />
        </FormField>
        <FormField label="Amount" htmlFor="pay-amount" error={errors.amount?.message} required>
          <Input id="pay-amount" inputMode="decimal" invalid={!!errors.amount} {...register('amount')} />
        </FormField>
        <FormField label="Payment date" htmlFor="pay-date" error={errors.date?.message} required>
          <Input id="pay-date" type="date" max={todayInput()} invalid={!!errors.date} {...register('date')} />
        </FormField>
        <FormField label="Note" htmlFor="pay-note" error={errors.note?.message} hint="Reference no., cheque no., etc." className="sm:col-span-2">
          <Textarea id="pay-note" rows={2} invalid={!!errors.note} {...register('note')} />
        </FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
