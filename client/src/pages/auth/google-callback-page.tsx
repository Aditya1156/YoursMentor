import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/layout/auth-shell'
import { FormAlert } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { homeFor } from '@/features/auth/types'

/**
 * Lands here after Google. The server already set the refresh cookie and put a
 * short-lived access token in the URL; we adopt it and clear the address bar.
 */
export default function GoogleCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { adoptToken } = useAuth()
  const [failed, setFailed] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const token = params.get('token')
    const next = params.get('next')
    if (!token) {
      setFailed(true)
      return
    }
    ;(async () => {
      try {
        const user = await adoptToken(token)
        const safe = next?.startsWith('/') && !next.startsWith('//') ? next : homeFor(user)
        navigate(safe, { replace: true })
      } catch {
        setFailed(true)
      }
    })()
  }, [params, adoptToken, navigate])

  if (failed) {
    return (
      <AuthShell title="Sign-in did not complete">
        <FormAlert>
          <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
          We could not finish signing you in with Google.
        </FormAlert>
        <Button full size="lg" className="mt-5" asChild>
          <Link to="/login">Back to log in</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Signing you in">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        One moment…
      </p>
    </AuthShell>
  )
}
