'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

/**
 * The 24-hour rule lives in cancel_booking(); this only tells the student what
 * is about to happen so they are not surprised by losing the money.
 */
export function CancelBookingButton({
  bookingId, refundable,
}: { bookingId: string; refundable: boolean }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function cancel() {
    setBusy(true)
    const { error } = await createClient().rpc('cancel_booking', { p_booking: bookingId })
    setBusy(false)
    setConfirming(false)
    if (!error) router.refresh()
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Cancel
      </Button>
    )
  }

  return (
    <span className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-surface-muted px-2.5 py-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {refundable ? 'Refunded as credits.' : 'No refund this close to the session.'}
      </span>
      <Button variant="danger" size="sm" disabled={busy} onClick={cancel}>
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        Confirm
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Keep</Button>
    </span>
  )
}
