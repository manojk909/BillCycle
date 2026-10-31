import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Button, Card, CardBody, CardHeader, FormField, Input, PageHeader, PageSpinner, useToast } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { useProfile, useUpdateProfile, type Profile } from '../api'

const optional = (schema: z.ZodString) => schema.or(z.literal(''))

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
  companyName: optional(z.string().trim().max(120, 'Company name is too long')),
  phone: optional(z.string().trim().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number')),
  street: optional(z.string().trim().max(200)),
  city: optional(z.string().trim().max(80)),
  state: optional(z.string().trim().max(80)),
  zip: optional(z.string().trim().regex(/^[A-Za-z0-9 -]{3,10}$/, 'Enter a valid PIN / ZIP code')),
  country: optional(z.string().trim().max(80)),
})
type FormValues = z.infer<typeof schema>
const FIELDS = Object.keys(schema.shape) as (keyof FormValues)[]

const toForm = (p: Profile): FormValues => Object.fromEntries(FIELDS.map((f) => [f, p[f] ?? ''])) as FormValues

export function ProfilePage() {
  const toast = useToast()
  const { refresh } = useAuth()
  const { data: profile, isLoading, isError, error } = useProfile()
  const update = useUpdateProfile()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' })

  useEffect(() => {
    if (profile) reset(toForm(profile))
  }, [profile, reset])

  async function onSubmit(values: FormValues) {
    try {
      const saved = await update.mutateAsync(values)
      reset(toForm(saved))
      await refresh()
      toast.success('Profile saved')
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not save profile'))
    }
  }

  if (isLoading) return <PageSpinner />
  if (isError || !profile) return <p className="py-10 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load profile')}</p>

  const field = (name: keyof FormValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <FormField label={label} htmlFor={name} error={errors[name]?.message} required={name === 'name'}>
      <Input id={name} invalid={!!errors[name]} {...props} {...register(name)} />
    </FormField>
  )

  return (
    <>
      <PageHeader title="My profile" subtitle={`Signed in as ${profile.loginEmail}`} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Contact" />
          <CardBody className="grid gap-4">
            {field('name', 'Full name')}
            {field('companyName', 'Company')}
            {field('phone', 'Phone', { type: 'tel', placeholder: '+91 98765 43210' })}
            <p className="text-xs text-gray-500">
              To change your password, use{' '}
              <Link to="/forgot-password" className="text-primary-700 hover:underline">
                Forgot password
              </Link>
              .
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Billing address" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field('street', 'Street')}</div>
            {field('city', 'City')}
            {field('state', 'State')}
            {field('zip', 'PIN / ZIP')}
            {field('country', 'Country')}
          </CardBody>
        </Card>
        <div className="flex justify-end md:col-span-2">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save profile
          </Button>
        </div>
      </form>
    </>
  )
}
