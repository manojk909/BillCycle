import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button, FormField, useToast } from '@/components/ui'
import { api, ApiError, errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { passwordSchema } from '@/lib/validators'
import { PasswordChecklist, PasswordInput } from '../components/PasswordInput'

const schema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
type FormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [invalidToken, setInvalidToken] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: { password: '' } })
  const password = watch('password') ?? ''

  async function onSubmit({ password }: FormValues) {
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success('Password updated. You can sign in now.')
      navigate('/login', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_OR_EXPIRED_TOKEN') setInvalidToken(true)
      else if (!applyServerErrors(err, setError)) toast.error(errorMessage(err))
    }
  }

  if (invalidToken) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Link expired or invalid</h1>
        <p className="mt-2 text-sm text-gray-500">This reset link can't be used any more. Request a new one to continue.</p>
        <Link to="/forgot-password" className="mt-6 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900">Set a new password</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">Choose a strong password you haven't used before.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="New password" htmlFor="password" error={errors.password?.message} required>
          <PasswordInput id="password" autoComplete="new-password" autoFocus invalid={!!errors.password} {...register('password')} />
        </FormField>
        <PasswordChecklist password={password} />
        <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
          <PasswordInput id="confirmPassword" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </FormField>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </>
  )
}
