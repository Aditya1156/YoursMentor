'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthDivider } from '@/components/auth/auth-card'
import { ErrorBanner } from '@/components/auth/error-banner'
import { GoogleButton } from '@/components/auth/google-button'
import { Button } from '@/components/ui/button'
import { Field, Input, PasswordInput } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

/** A2 — Log in. `next` comes from the proxy when a protected page bounced you. */
export function SignInForm({ next, initialError }: { next?: string; initialError?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (signInError) {
      setLoading(false)
      // Supabase already answers identically for a wrong password and an
      // unknown email, so this message cannot be used to enumerate accounts.
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'That email or password is not right.'
          : signInError.message
      )
      return
    }

    // The proxy decides where an unfinished profile actually lands.
    router.push(next ?? '/dashboard')
    router.refresh()
  }

  return (
    <>
      <GoogleButton next={next} />
      <AuthDivider />

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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="password" className="text-sm font-semibold">
              Password
            </label>
            <Link
              href="/reset"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" full size="lg" disabled={loading} className="mt-1">
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {loading ? 'Signing you in…' : 'Log in'}
        </Button>
      </form>
    </>
  )
}
