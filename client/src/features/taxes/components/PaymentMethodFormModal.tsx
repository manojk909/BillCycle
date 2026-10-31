import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Checkbox, FormField, Input, Modal, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { paymentMethods, type PaymentMethod } from '../api'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name is too long'),
  isActive: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export function PaymentMethodFormModal({ open, method, onClose }: { open: boolean; method: PaymentMethod | null; onClose: () => void }) {
  const toast = useToast()
  const save = paymentMethods.useSave(method?.id ?? null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' })

  useEffect(() => {
    if (open) reset(method ? { name: method.name, isActive: method.isActive } : { name: '', isActive: true })
  }, [open, method, reset])

  async function onSubmit(values: FormValues) {
    try {
      await save.mutateAsync(values)
      toast.success(method ? 'Payment method updated' : 'Payment method created')
      onClose()
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not save payment method'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={method ? 'Edit payment method' : 'New payment method'}
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
        <FormField label="Name" htmlFor="method-name" error={errors.name?.message} required>
          <Input id="method-name" autoFocus placeholder="Bank transfer" invalid={!!errors.name} {...register('name')} />
        </FormField>
        <Checkbox id="method-active" label="Active (can be chosen when recording a payment)" {...register('isActive')} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
