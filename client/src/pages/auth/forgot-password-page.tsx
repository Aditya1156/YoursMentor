import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FormAlert, Input } from '@/components/ui/input'
import { AuthShell } from '@/components/layout/auth-shell'
import { forgotPasswordFormSchema } from '@/lib/validation'
import { api, ApiError } from '@/lib/api'

type Form = z.infer<typeof forgotPasswordFormSchema>

/** A4a — Forgot password. */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(forgotPasswordFormSchema), mode: 'onTouched' })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: values })
      setSent(true)
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'We could not reach the server.'
      )
    }
  })

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="If that email is registered with us, a reset link is on its way. It works for one hour."
        footer={
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to log in
          </Link>
        }
      >
        <FormAlert tone="success">
          <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden />
          Reset link sent.
        </FormAlert>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you signed up with and we will send you a link."
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <FormAlert>
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
            {formError}
          </FormAlert>
        )}

        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={!!errors.email}
            {...register('email')}
          />
        </Field>

        <Button type="submit" full size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Send reset link
        </Button>
      </form>
    </AuthShell>
  )
}
