'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ErrorBanner } from '@/components/auth/error-banner'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, FieldError, Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { completeProfileSchema } from '@/lib/validation'

/**
 * The 18+ gate. Only Google sign-ins land here — an email sign-up sends its
 * date of birth through sign-up metadata, which handle_new_user() writes
 * straight into the profile.
 */
export function CompleteProfileForm({ next }: { next?: string }) {
  const router = useRouter()
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const parsed = completeProfileSchema.safeParse({
      dateOfBirth,
      isAdultConfirmed,
      acceptedTerms,
    })
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join('.')] ??= issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      setFormError('Your session expired. Please sign in again.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        date_of_birth: parsed.data.dateOfBirth,
        is_adult_confirmed: true,
        accepted_terms_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    setLoading(false)

    if (error) {
      // The adult_needs_dob constraint is the last line of defence.
      setFormError(
        error.message.includes('adult_needs_dob')
          ? "We're only open to 18+ right now."
          : error.message
      )
      return
    }

    router.push(next ?? '/onboarding')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && <ErrorBanner>{formError}</ErrorBanner>}

      <Field
        label="Date of birth"
        htmlFor="dateOfBirth"
        error={errors.dateOfBirth}
        hint="OneStep is open to 18+ only for now."
        required
      >
        <Input
          id="dateOfBirth"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          autoComplete="bday"
          invalid={!!errors.dateOfBirth}
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
      </Field>

      <div className="flex flex-col gap-2.5">
        <label className="flex cursor-pointer gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <Checkbox
            checked={isAdultConfirmed}
            onChange={(e) => setIsAdultConfirmed(e.target.checked)}
          />
          <span>I am 18 years old or older.</span>
        </label>
        <FieldError>{errors.isAdultConfirmed}</FieldError>

        <label className="flex cursor-pointer gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <Checkbox
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
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

      <Button type="submit" full size="lg" disabled={loading}>
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        Finish setting up
      </Button>
    </form>
  )
}
