import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, FormField, Input, Modal, Select, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { emailSchema, passwordSchema } from '@/lib/validators'
import { PasswordChecklist, PasswordInput } from '@/features/auth/components/PasswordInput'
import { useCreateUser } from '../api'

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
  email: emailSchema,
  role: z.enum(['INTERNAL', 'ADMIN']),
  password: passwordSchema,
})
type FormValues = z.infer<typeof schema>

const ROLE_OPTIONS = [
  { value: 'INTERNAL', label: 'Internal staff (day-to-day work)' },
  { value: 'ADMIN', label: 'Admin (full control)' },
]

export function NewStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const create = useCreateUser()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '', role: 'INTERNAL', password: '' },
  })

  function close() {
    reset()
    onClose()
  }

  async function onSubmit(values: FormValues) {
    try {
      const user = await create.mutateAsync(values)
      toast.success(`${user.name} can now log in as ${user.role === 'ADMIN' ? 'admin' : 'staff'}`)
      close()
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not create user'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New staff member"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Create account
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Full name" htmlFor="staff-name" error={errors.name?.message} required>
          <Input id="staff-name" autoFocus invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField label="Work email" htmlFor="staff-email" error={errors.email?.message} required>
          <Input id="staff-email" type="email" autoComplete="off" invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Role" htmlFor="staff-role" error={errors.role?.message} required>
          <Select id="staff-role" options={ROLE_OPTIONS} {...register('role')} />
        </FormField>
        <FormField
          label="Temporary password"
          htmlFor="staff-password"
          error={errors.password?.message}
          hint="Share it securely; they can change it with Forgot password."
          required
        >
          <PasswordInput id="staff-password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </FormField>
        <PasswordChecklist password={watch('password') ?? ''} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
