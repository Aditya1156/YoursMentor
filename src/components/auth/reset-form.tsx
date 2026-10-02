'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorBanner } from '@/components/auth/error-banner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

/** A4a — Forgot password. */
export function ResetForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error: resetError } = await createClient().auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/confirm?next=/update-password` }
    )

    setLoading(false)
    // Supabase answers the same for a registered and an unknown address, so
    // showing success either way leaks nothing.
    if (resetError) {
      setError(resetError.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <ErrorBanner tone="success">
        If that email is registered with us, a reset link is on its way. It works for
        one hour.
      </ErrorBanner>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Button type="submit" full size="lg" disabled={loading}>
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        Send reset link
      </Button>
    </form>
  )
}
