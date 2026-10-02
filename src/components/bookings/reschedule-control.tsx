'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Pending {
  id: string
  proposedStart: string
  proposedEnd: string
  reason: string | null
  requestedByName: string
  mine: boolean
}

const WHEN = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short',
  hour: 'numeric', minute: '2-digit',
})

/** A datetime-local value for "now + minutes", in the viewer's own zone. */
function localInputValue(minutesFromNow: number) {
  const d = new Date(Date.now() + minutesFromNow * 60_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Proposing and answering a new time for a 1:1.
 *
 * Both sides see the same component and it works out which half to show from
 * who made the open request, so the student screen and the mentor screen stay
 * in step without either query layer knowing about reschedules.
 *
 * Nothing here decides whether a move is allowed — request_reschedule() and
 * respond_to_reschedule() do, including re-checking the mentor's calendar at
 * the moment of acceptance. This only collects the time and reports what the
 * database said.
 */
export function RescheduleControl({
  sessionId, startAt, className,
}: {
  sessionId: string
  startAt: string
  className?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState<Pending | null | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [when, setWhen] = useState(() => localInputValue(60))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: rpcError } = await createClient()
      .rpc('pending_reschedule', { p_session: sessionId })
    if (rpcError) {
      setPending(null)
      return
    }
    const row = (data ?? [])[0]
    setPending(
      row
        ? {
            id: row.id,
            proposedStart: row.proposed_start,
            proposedEnd: row.proposed_end,
            reason: row.reason,
            requestedByName: row.requested_by_name,
            mine: row.mine,
          }
        : null
    )
  }, [sessionId])

  useEffect(() => {
    let live = true
    void (async () => {
      const { data } = await createClient().rpc('pending_reschedule', { p_session: sessionId })
      if (!live) return
      const row = (data ?? [])[0]
      setPending(
        row
          ? {
              id: row.id,
              proposedStart: row.proposed_start,
              proposedEnd: row.proposed_end,
              reason: row.reason,
              requestedByName: row.requested_by_name,
              mine: row.mine,
            }
          : null
      )
    })()
    return () => {
      live = false
    }
  }, [sessionId])

  // The Supabase builder is thenable rather than a real Promise, so this
  // takes PromiseLike and awaits it.
  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true)
    setError(null)
    const { error: rpcError } = await fn()
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return false
    }
    await load()
    router.refresh()
    return true
  }

  const propose = async () => {
    const iso = new Date(when).toISOString()
    const ok = await run(() =>
      createClient().rpc('request_reschedule', {
        p_session: sessionId,
        p_start_at: iso,
        p_reason: reason.trim() || null,
      })
    )
    if (ok) {
      setOpen(false)
      setReason('')
    }
  }

  // Still loading, or nothing to show because the session is not reschedulable.
  if (pending === undefined) return null

  // ---------------------------------------------------------------- answer --
  if (pending && !pending.mine) {
    return (
      <div className={cn('rounded-[var(--radius-md)] border border-accent bg-accent-soft p-3', className)}>
        <p className="text-[0.8125rem] font-bold leading-snug">
          {pending.requestedByName} asked to move this to{' '}
          {WHEN.format(new Date(pending.proposedStart))}
        </p>
        {pending.reason && (
          <p className="mt-1 text-xs italic text-muted-foreground">
            &ldquo;{pending.reason}&rdquo;
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Currently {WHEN.format(new Date(startAt))}. It only moves if you accept.
        </p>
        {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            disabled={busy}
            onClick={() =>
              void run(() =>
                createClient().rpc('respond_to_reschedule', {
                  p_request: pending.id, p_accept: true,
                })
              )
            }
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            Accept new time
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(() =>
                createClient().rpc('respond_to_reschedule', {
                  p_request: pending.id, p_accept: false,
                })
              )
            }
          >
            Keep {WHEN.format(new Date(startAt))}
          </Button>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------- waiting ----
  if (pending?.mine) {
    return (
      <div className={cn('rounded-[var(--radius-md)] border border-dashed border-border bg-surface-muted p-3', className)}>
        <p className="text-[0.8125rem] font-semibold leading-snug">
          Waiting for them to accept {WHEN.format(new Date(pending.proposedStart))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Until they do, the session stays at {WHEN.format(new Date(startAt))}.
        </p>
        {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
        <Button
          size="sm"
          variant="ghost"
          className="mt-2"
          disabled={busy}
          onClick={() =>
            void run(() =>
              createClient().rpc('withdraw_reschedule', { p_request: pending.id })
            )
          }
        >
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          <X aria-hidden /> Withdraw
        </Button>
      </div>
    )
  }

  // ------------------------------------------------------------- propose ----
  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className={className}
        onClick={() => {
          setOpen(true)
          setError(null)
        }}
      >
        <CalendarClock aria-hidden /> Reschedule
      </Button>
    )
  }

  return (
    <div className={cn('rounded-[var(--radius-md)] border border-border bg-surface-muted p-3', className)}>
      <label className="block text-xs font-semibold" htmlFor={`when-${sessionId}`}>
        Suggest a new time
      </label>
      <input
        id={`when-${sessionId}`}
        type="datetime-local"
        value={when}
        min={localInputValue(30)}
        onChange={(e) => setWhen(e.target.value)}
        className="mt-1 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5 text-sm"
      />
      <label className="mt-2 block text-xs font-semibold" htmlFor={`why-${sessionId}`}>
        Why? <span className="font-normal text-subtle-foreground">(optional)</span>
      </label>
      <input
        id={`why-${sessionId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        placeholder="Interview moved up, need help sooner"
        className="mt-1 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5 text-sm"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        The other person has to accept before anything changes.
      </p>
      {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="primary" disabled={busy || !when} onClick={() => void propose()}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          Send request
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
