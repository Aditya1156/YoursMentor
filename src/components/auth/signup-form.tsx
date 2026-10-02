'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, MailCheck } from 'lucide-react'
import { AuthDivider } from '@/components/auth/auth-card'
import { ErrorBanner } from '@/components/auth/error-banner'
import { GoogleButton } from '@/components/auth/google-button'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, FieldError, Input, PasswordInput } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { signupFormSchema } from '@/lib/validation'

/** A1 — Sign up. Supabase Auth owns the credentials; the trigger on
 *  auth.users creates the matching profiles row from this metadata. */
export function SignUpForm({ role }: { role: 'student' | 'mentor' }) {
  const router = useRouter()
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    dateOfBirth: '',
    isAdultConfirmed: false,
    acceptedTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => {
      if (!(key in e)) return e
      const rest = { ...e }
      delete rest[key as string]
      return rest
    })
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const parsed = signupFormSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.')
        fieldErrors[key] ??= issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        // handle_new_user() reads these straight into public.profiles, so the
        // 18+ answers survive confirming the email on a different device.
        data: {
          name: parsed.data.name,
          role,
          date_of_birth: parsed.data.dateOfBirth,
          accepted_terms: true,
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${
          role === 'mentor' ? '/mentor/apply' : '/onboarding'
        }`,
      },
    })

    if (error) {
      setLoading(false)
      setFormError(
        error.message === 'User already registered'
          ? 'That email is already registered. Try signing in instead.'
          : error.message
      )
      return
    }

    setLoading(false)
    setAwaitingConfirm(true)
    router.refresh()
  }

  if (awaitingConfirm) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorBanner tone="success">
          <MailCheck className="hidden" aria-hidden />
          Check your inbox — we sent a confirmation link to{' '}
          <strong className="font-bold">{values.email}</strong>.
        </ErrorBanner>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Confirm your email and you can book your first ₹99 group session. The link
          works for 24 hours.
        </p>
        <Button variant="outline" asChild full>
          <Link href="/signin">Back to log in</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <GoogleButton role={role} next={role === 'mentor' ? '/mentor/apply' : '/onboarding'} />
      <AuthDivider />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <ErrorBanner>{formError}</ErrorBanner>}

        <Field label="Full name" htmlFor="name" error={errors.name} required>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Rohan Sharma"
            invalid={!!errors.name}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email} required>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={!!errors.email}
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          hint="At least 8 characters."
          required
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            value={values.password}
            onChange={(e) => set('password', e.target.value)}
          />
        </Field>

        <Field
          label="Date of birth"
          htmlFor="dateOfBirth"
          error={errors.dateOfBirth}
          hint="YoursMentor is open to 18+ only for now."
          required
        >
          <Input
            id="dateOfBirth"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            autoComplete="bday"
            invalid={!!errors.dateOfBirth}
            value={values.dateOfBirth}
            onChange={(e) => set('dateOfBirth', e.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2.5 pt-1">
          <label className="flex cursor-pointer gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Checkbox
              checked={values.isAdultConfirmed}
              onChange={(e) => set('isAdultConfirmed', e.target.checked)}
            />
            <span>I am 18 years old or older.</span>
          </label>
          <FieldError>{errors.isAdultConfirmed}</FieldError>

          <label className="flex cursor-pointer gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Checkbox
              checked={values.acceptedTerms}
              onChange={(e) => set('acceptedTerms', e.target.checked)}
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="font-semibold text-primary hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          <FieldError>{errors.acceptedTerms}</FieldError>
        </div>

        <Button type="submit" full size="lg" disabled={loading} className="mt-1">
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {loading ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </>
  )
}
