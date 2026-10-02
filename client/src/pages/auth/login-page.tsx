import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FormAlert, Input, PasswordInput } from '@/components/ui/input'
import { AuthDivider, AuthShell, GoogleButton } from '@/components/layout/auth-shell'
import { useAuth } from '@/features/auth/auth-context'
import { homeFor } from '@/features/auth/types'
import { loginFormSchema, type LoginForm } from '@/lib/validation'
import { ApiError } from '@/lib/api'

/** A2 — Log in. Honours ?returnTo= so a mid-booking login comes back. */
export default function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { login, user, isLoading } = useAuth()
  const [formError, setFormError] = useState<string | null>(
    params.get('error') === 'google' ? 'Google sign-in did not complete. Try again.' : null
  )

  const returnTo = params.get('returnTo')
  const safeReturnTo =
    returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginFormSchema), mode: 'onTouched' })

  if (!isLoading && user) return <Navigate to={safeReturnTo ?? homeFor(user)} replace />

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const signedIn = await login(values.email, values.password)
      navigate(safeReturnTo ?? homeFor(signedIn), { replace: true })
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
      title="Welcome back"
      subtitle="Sign in to see your upcoming sessions and book your next one."
      footer={
        <>
          New to OneStep?{' '}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton returnTo={safeReturnTo ?? undefined} />
      <AuthDivider />

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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="password" className="text-sm font-semibold">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password?.message && (
            <p className="text-xs font-medium text-danger">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" full size="lg" disabled={isSubmitting} className="mt-1">
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {isSubmitting ? 'Signing you in…' : 'Log in'}
        </Button>
      </form>
    </AuthShell>
  )
}
