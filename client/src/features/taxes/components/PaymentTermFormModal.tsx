import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, FormField, Input, Modal, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { paymentTerms, type PaymentTerm } from '../api'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name is too long'),
  dueDays: z.coerce
    .number({ invalid_type_error: 'Enter the number of days' })
    .int('Use whole days')
    .min(0, 'Due days must be between 0 and 365')
    .max(365, 'Due days must be between 0 and 365'),
})
type FormValues = z.infer<typeof schema>

export function PaymentTermFormModal({ open, term, onClose }: { open: boolean; term: PaymentTerm | null; onClose: () => void }) {
  const toast = useToast()
  const save = paymentTerms.useSave(term?.id ?? null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' })

  useEffect(() => {
    if (open) reset(term ? { name: term.name, dueDays: term.dueDays } : { name: '', dueDays: 30 })
  }, [open, term, reset])

  async function onSubmit(values: FormValues) {
    try {
      await save.mutateAsync(values)
      toast.success(term ? 'Payment term updated' : 'Payment term created')
      onClose()
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not save payment term'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={term ? 'Edit payment term' : 'New payment term'}
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
        <FormField label="Name" htmlFor="term-name" error={errors.name?.message} required>
          <Input id="term-name" autoFocus placeholder="Net 30" invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField
          label="Due after (days)"
          htmlFor="term-days"
          error={errors.dueDays?.message}
          hint="Invoice due date = invoice date + these days. 0 means due immediately."
          required
        >
          <Input id="term-days" type="number" min={0} max={365} invalid={!!errors.dueDays} {...register('dueDays')} />
        </FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
