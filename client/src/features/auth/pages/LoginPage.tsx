import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button, FormField, Input } from '@/components/ui'
import { homePathFor, useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { emailSchema } from '@/lib/validators'
import { PasswordInput } from '../components/PasswordInput'

const schema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' })

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      const user = await login(values.email, values.password)
      const from = (location.state as { from?: string } | null)?.from
      const home = homePathFor(user.role)
      navigate(from && from.startsWith(home.split('/').slice(0, 2).join('/')) ? from : home, { replace: true })
    } catch (err) {
      if (!applyServerErrors(err, setError)) setFormError(errorMessage(err, 'Login failed'))
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">Welcome back. Enter your details to continue.</p>

      {formError && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-danger-600/30 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" autoFocus invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <PasswordInput id="password" autoComplete="current-password" invalid={!!errors.password} {...register('password')} />
        </FormField>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        New to BillCycle?{' '}
        <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-700">
          Create an account
        </Link>
      </p>
    </>
  )
}
