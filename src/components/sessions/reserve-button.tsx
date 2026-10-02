'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@/lib/utils'

/**
 * Calls hold_seat() and sends the student to checkout with the booking id.
 * Every rule — capacity, already booked, session started — is enforced inside
 * the function, so whatever it raises is what we show.
 */
export function ReserveButton({
  sessionId, price, disabled, label, signedIn,
}: {
  sessionId: string
  price: number
  disabled?: boolean
  label?: string
  signedIn: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reserve() {
    if (!signedIn) {
      router.push(`/signin?next=${encodeURIComponent(`/sessions/${sessionId}`)}`)
      return
    }
    setBusy(true)
    setError(null)
    const { data, error: rpcError } = await createClient()
      .rpc('hold_seat', { p_session: sessionId })
    setBusy(false)

    if (rpcError) {
      setError(rpcError.message)
      router.refresh()
      return
    }
    router.push(`/checkout/${data}`)
  }

  return (
    <div className="flex flex-col gap-2.5">
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <Button variant="group" full size="lg" disabled={disabled || busy} onClick={reserve}>
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        {label ?? (signedIn ? `Reserve seat · ${formatINR(price)}` : 'Sign in to reserve')}
      </Button>
      {!disabled && (
        <p className="text-center text-[0.6875rem] text-subtle-foreground">
          Your seat is held for 10 minutes while you pay.
        </p>
      )}
    </div>
  )
}
