'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Video, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

/**
 * "Start now" — asking the other person whether they are free this second.
 *
 * Deliberately not a reschedule. A reschedule commits somebody to a time they
 * are not present for, which is why it keeps a thirty-minute floor; this asks a
 * question only the other person can answer and only right now, and the room
 * opens because they said yes rather than because a clock was adjusted.
 *
 * After asking, this polls. The other side's answer arrives on their own screen,
 * so there is nothing to click here — when they accept, this walks into the
 * room on its own. The request lapses after five minutes server-side, and
 * polling stops with it.
 */
export function StartNowButton({
  sessionId, className,
}: {
  sessionId: string
  className?: string
}) {
  const router = useRouter()
  const [requestId, setRequestId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'waiting' | 'declined' | 'expired'>('idle')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => stop, [stop])

  const ask = async () => {
    setBusy(true)
    setError(null)
    const { data, error: rpcError } = await createClient()
      .rpc('request_start_now', { p_session: sessionId })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setRequestId(data as string)
    setState('waiting')

    // The answer happens on someone else's screen, so there is nothing to react
    // to locally. Five seconds is often enough to feel immediate without
    // hammering the database.
    timer.current = setInterval(() => {
      void (async () => {
        const { data: rows } = await createClient()
          .rpc('start_now_status', { p_request: data as string })
        const row = (rows ?? [])[0]
        if (!row) return
        if (row.status === 'accepted') {
          stop()
          router.push(`/room/${row.session_id}`)
        } else if (row.status === 'declined') {
          stop()
          setState('declined')
        } else if (row.status === 'expired' || row.status === 'withdrawn') {
          stop()
          setState('expired')
        }
      })()
    }, 5000)
  }

  const cancel = async () => {
    if (!requestId) return
    setBusy(true)
    await createClient().rpc('decline_start_now', { p_request: requestId })
    setBusy(false)
    stop()
    setRequestId(null)
    setState('idle')
    router.refresh()
  }

  if (state === 'waiting') {
    return (
      <div className={cn('rounded-[var(--radius-md)] border border-primary/40 bg-primary-soft p-3', className)}>
        <p className="flex items-center gap-2 text-[0.8125rem] font-bold">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Asking if they can start now…
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          You will go straight into the room when they accept. This lapses after
          five minutes.
        </p>
        <Button size="sm" variant="ghost" className="mt-2" disabled={busy} onClick={() => void cancel()}>
          <X aria-hidden /> Never mind
        </Button>
      </div>
    )
  }

  if (state === 'declined' || state === 'expired') {
    return (
      <div className={cn('rounded-[var(--radius-md)] border border-border bg-surface-muted p-3', className)}>
        <p className="text-[0.8125rem] font-semibold">
          {state === 'declined'
            ? 'They cannot start right now.'
            : 'No answer — the request lapsed.'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your session is still on at its booked time.
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2"
          onClick={() => {
            setState('idle')
            setRequestId(null)
          }}
        >
          Ask again
        </Button>
      </div>
    )
  }

  return (
    <div className={className}>
      <Button size="sm" variant="group" disabled={busy} onClick={() => void ask()}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Video aria-hidden />}
        Start now
      </Button>
      {error && <p className="mt-1 text-xs font-semibold text-danger">{error}</p>}
    </div>
  )
}
