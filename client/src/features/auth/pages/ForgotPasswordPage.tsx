import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { Button, FormField, Input, useToast } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { emailSchema } from '@/lib/validators'

const schema = z.object({ email: emailSchema })
type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const toast = useToast()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' })

  async function onSubmit({ email }: FormValues) {
    try {
      await api.post('/auth/forgot-password', { email })
      setSentTo(email)
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err))
    }
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Check your email</h1>
        <p className="mt-2 text-sm text-gray-500">
          If an account exists for <span className="font-medium text-gray-700">{sentTo}</span>, a reset link has been sent. The link
          expires soon, so use it shortly.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900">Forgot your password?</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">Enter your registered email and we'll send you a reset link.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" autoFocus invalid={!!errors.email} {...register('email')} />
        </FormField>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Back to sign in
        </Link>
      </p>
    </>
  )
}
