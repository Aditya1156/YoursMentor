import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Checkbox,
  Field,
  FieldError,
  FormAlert,
  Input,
  PasswordInput,
} from '@/components/ui/input'
import { AuthDivider, AuthShell, GoogleButton } from '@/components/layout/auth-shell'
import { useAuth } from '@/features/auth/auth-context'
import { homeFor } from '@/features/auth/types'
import { signupFormSchema, type SignupForm } from '@/lib/validation'
import { ApiError } from '@/lib/api'

/** A1 — Sign up. `/signup?role=student|mentor` */
export default function SignupPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { signup, user, isLoading } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const role = params.get('role') === 'mentor' ? 'mentor' : 'student'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupFormSchema),
    mode: 'onTouched',
  })

  if (!isLoading && user) return <Navigate to={homeFor(user)} replace />

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const created = await signup({ ...values, role })
      // Mentors go straight to their application (spec §8 A1).
      navigate(role === 'mentor' ? '/mentor/apply' : '/onboarding', { replace: true })
      return created
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          for (const [field, message] of Object.entries(err.fieldErrors)) {
            if (field in values) setError(field as keyof SignupForm, { message })
          }
        }
        if (err.code === 'EMAIL_TAKEN') {
          setError('email', { message: 'That email is already registered.' })
          return
        }
        setFormError(err.fieldErrors ? null : err.message)
        return
      }
      setFormError('We could not reach the server. Check your connection and try again.')
    }
  })

  return (
    <AuthShell
      title={role === 'mentor' ? 'Apply to mentor' : 'Create your account'}
      subtitle={
        role === 'mentor'
          ? 'Set up your account first — the application comes next and takes about 10 minutes.'
          : 'Book ₹99 group sessions and 1:1 calls with seniors who were exactly where you are.'
      }
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <GoogleButton role={role} />
      <AuthDivider />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <FormAlert>
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
            {formError}
          </FormAlert>
        )}

        <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Rohan Sharma"
            invalid={!!errors.name}
            {...register('name')}
          />
        </Field>

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

        <Field
          label="Password"
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
          label="Date of birth"
          htmlFor="dateOfBirth"
          error={errors.dateOfBirth?.message}
          hint="OneStep is open to 18+ only for now."
          required
        >
          <Input
            id="dateOfBirth"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            autoComplete="bday"
            invalid={!!errors.dateOfBirth}
            {...register('dateOfBirth')}
          />
        </Field>

        <div className="flex flex-col gap-2.5 pt-1">
          <label className="flex cursor-pointer gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Checkbox {...register('isAdultConfirmed')} />
            <span>I am 18 years old or older.</span>
          </label>
          <FieldError>{errors.isAdultConfirmed?.message}</FieldError>

          <label className="flex cursor-pointer gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Checkbox {...register('acceptedTerms')} />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="font-semibold text-primary hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          <FieldError>{errors.acceptedTerms?.message}</FieldError>
        </div>

        <Button type="submit" full size="lg" disabled={isSubmitting} className="mt-1">
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {isSubmitting ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
