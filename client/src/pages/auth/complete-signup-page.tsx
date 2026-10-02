import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, FieldError, FormAlert, Input } from '@/components/ui/input'
import { AuthShell } from '@/components/layout/auth-shell'
import { useAuth } from '@/features/auth/auth-context'
import { homeFor, type AuthUser } from '@/features/auth/types'
import { completeSignupFormSchema } from '@/lib/validation'
import { api, ApiError } from '@/lib/api'

type Form = z.infer<typeof completeSignupFormSchema>

/**
 * Google never tells us a date of birth, so a Google signup stops here until the
 * 18+ confirmation exists (spec §8 A1).
 */
export default function CompleteSignupPage() {
  const navigate = useNavigate()
  const { user, isLoading, setUser } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(completeSignupFormSchema), mode: 'onTouched' })

  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.isAdultConfirmed) return <Navigate to={homeFor(user)} replace />

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const res = await api<{ user: AuthUser }>('/api/auth/complete-signup', {
        method: 'POST',
        body: { ...values, dateOfBirth: values.dateOfBirth },
      })
      setUser(res.user)
      navigate(homeFor(res.user), { replace: true })
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'We could not reach the server.'
      )
    }
  })

  return (
    <AuthShell
      title={`Almost there, ${user.name.split(' ')[0]}`}
      subtitle="We need two more things before you can book a session."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <FormAlert>
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
            {formError}
          </FormAlert>
        )}

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

        <div className="flex flex-col gap-2.5">
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

        <Button type="submit" full size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Finish signing up
        </Button>
      </form>
    </AuthShell>
  )
}
