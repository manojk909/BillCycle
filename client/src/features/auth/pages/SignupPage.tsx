import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button, FormField, Input } from '@/components/ui'
import { homePathFor, useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { emailSchema, passwordSchema } from '@/lib/validators'
import { PasswordChecklist, PasswordInput } from '../components/PasswordInput'

const schema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
    companyName: z.string().trim().max(120, 'Company name is too long').optional(),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: { password: '' } })
  const password = watch('password') ?? ''

  async function onSubmit({ name, companyName, email, password }: FormValues) {
    setFormError(null)
    try {
      const user = await signup({ name, email, password, companyName: companyName || undefined })
      navigate(homePathFor(user.role), { replace: true })
    } catch (err) {
      if (!applyServerErrors(err, setError)) setFormError(errorMessage(err, 'Sign up failed'))
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">Manage your subscriptions and invoices in one place.</p>

      {formError && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-danger-600/30 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Full name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" autoFocus invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField label="Company" htmlFor="companyName" error={errors.companyName?.message} hint="Optional">
          <Input id="companyName" autoComplete="organization" invalid={!!errors.companyName} {...register('companyName')} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <PasswordInput id="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </FormField>
        <PasswordChecklist password={password} />
        <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
          <PasswordInput id="confirmPassword" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </FormField>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </>
  )
}
