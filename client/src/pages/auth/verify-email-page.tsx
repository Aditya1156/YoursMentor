import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FormAlert, Input } from '@/components/ui/input'
import { AuthShell } from '@/components/layout/auth-shell'
import { useAuth } from '@/features/auth/auth-context'
import { homeFor } from '@/features/auth/types'
import { api, ApiError } from '@/lib/api'

type State = 'checking' | 'success' | 'expired' | 'missing'

/** A3 — Verify email. `/verify-email?token=` */
export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const { user, setUser } = useAuth()
  const token = params.get('token')
  const [state, setState] = useState<State>(token ? 'checking' : 'missing')
  const [resent, setResent] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  // StrictMode double-invokes effects in dev; a one-time token must not be spent twice.
  const attempted = useRef(false)

  useEffect(() => {
    if (!token || attempted.current) return
    attempted.current = true
    ;(async () => {
      try {
        const res = await api<{ user: { emailVerified: boolean } }>(
          '/api/auth/verify-email',
          { method: 'POST', body: { token } }
        )
        setState('success')
        if (user && res.user.emailVerified) setUser({ ...user, emailVerified: true })
      } catch {
        setState('expired')
      }
    })()
  }, [token, user, setUser])

  async function resend(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/api/auth/resend-verification', {
        method: 'POST',
        body: { email: email || user?.email },
      })
      setResent(true)
    } catch (err) {
      if (!(err instanceof ApiError)) setResent(false)
    } finally {
      setBusy(false)
    }
  }

  if (state === 'checking') {
    return (
      <AuthShell title="Confirming your email">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          One moment…
        </p>
      </AuthShell>
    )
  }

  if (state === 'success') {
    return (
      <AuthShell
        title="Your email is confirmed"
        subtitle="You are all set. Book your first ₹99 group session whenever you are ready."
      >
        <FormAlert tone="success">
          <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden />
          Email confirmed.
        </FormAlert>
        <Button full size="lg" className="mt-5" asChild>
          <Link to={user ? homeFor(user) : '/login'}>
            {user ? 'Go to my dashboard' : 'Log in'}
          </Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={state === 'missing' ? 'Check your inbox' : 'That link has expired'}
      subtitle={
        state === 'missing'
          ? 'We sent you a confirmation link. Enter your email below if you need another one.'
          : 'Confirmation links last 24 hours. Enter your email and we will send a fresh one.'
      }
    >
      {resent ? (
        <FormAlert tone="success">
          <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden />
          If that account still needs confirming, a new link is on its way.
        </FormAlert>
      ) : (
        <form onSubmit={resend} className="flex flex-col gap-4">
          <FormAlert>
            <MailWarning className="mt-px size-4 shrink-0" aria-hidden />
            {state === 'missing'
              ? 'No confirmation link in this address.'
              : 'This link is no longer valid.'}
          </FormAlert>

          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={user?.email ?? 'you@example.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Button type="submit" full size="lg" disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            Send a new link
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
