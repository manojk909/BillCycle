import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, FormField, Modal, useToast } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { passwordSchema } from '@/lib/validators'
import { PasswordChecklist, PasswordInput } from './PasswordInput'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm the new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Must be different from the current password' })
type FormValues = z.infer<typeof schema>

/** Change password for the logged-in user (staff and customers). */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: { newPassword: '' } })

  function close() {
    reset()
    onClose()
  }

  async function onSubmit({ currentPassword, newPassword }: FormValues) {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      toast.success('Password changed')
      close()
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not change password'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Change password"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Change password
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Current password" htmlFor="cp-current" error={errors.currentPassword?.message} required>
          <PasswordInput id="cp-current" autoComplete="current-password" invalid={!!errors.currentPassword} {...register('currentPassword')} />
        </FormField>
        <FormField label="New password" htmlFor="cp-new" error={errors.newPassword?.message} required>
          <PasswordInput id="cp-new" autoComplete="new-password" invalid={!!errors.newPassword} {...register('newPassword')} />
        </FormField>
        <PasswordChecklist password={watch('newPassword') ?? ''} />
        <FormField label="Confirm new password" htmlFor="cp-confirm" error={errors.confirmPassword?.message} required>
          <PasswordInput id="cp-confirm" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
