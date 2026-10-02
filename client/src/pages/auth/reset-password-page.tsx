import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FormAlert, PasswordInput } from '@/components/ui/input'
import { AuthShell } from '@/components/layout/auth-shell'
import { useAuth } from '@/features/auth/auth-context'
import { homeFor, type SessionResponse } from '@/features/auth/types'
import { resetPasswordFormSchema, type ResetPasswordForm } from '@/lib/validation'
import { api, ApiError, setAccessToken } from '@/lib/api'

/** A4b — Reset password. `/reset-password?token=` */
export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const token = params.get('token')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: 'onTouched',
  })

  if (!token) {
    return (
      <AuthShell
        title="That link is incomplete"
        subtitle="Password reset links expire after an hour. Ask for a new one."
        footer={
          <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
            Send a new link
          </Link>
        }
      >
        <FormAlert>
          <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
          No reset token in this address.
        </FormAlert>
      </AuthShell>
    )
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const data = await api<SessionResponse>('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password: values.password },
      })
      // A successful reset signs you straight in and signs out every other device.
      setAccessToken(data.accessToken)
      setUser(data.user)
      navigate(homeFor(data.user), { replace: true })
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'We could not reach the server. Check your connection and try again.'
      )
    }
  })

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Picking a new password signs you out everywhere else."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <FormAlert>
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
            {formError}
          </FormAlert>
        )}

        <Field
          label="New password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters."
          required
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </Field>

        <Field
          label="Confirm new password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
          required
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </Field>

        <Button type="submit" full size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Save new password
        </Button>
      </form>
    </AuthShell>
  )
}
