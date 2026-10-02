'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'
import { cn, formatINR } from '@/lib/utils'

interface Slot {
  startsAt: string
  endsAt: string
}

interface Day {
  key: string
  label: string
  sub: string
  slots: Slot[]
}

const DAY = new Intl.DateTimeFormat('en-IN', { weekday: 'short' })
const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const TIME = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' })

/** Groups slots into the viewer's own days, not the mentor's. */
function toDays(slots: Slot[]): Day[] {
  const byDay = new Map<string, Slot[]>()
  for (const slot of slots) {
    const d = new Date(slot.startsAt)
    // Local date, so a 1am slot in Bengaluru does not land on yesterday.
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    const list = byDay.get(key)
    if (list) list.push(slot)
    else byDay.set(key, [slot])
  }
  return [...byDay.entries()].map(([key, list]) => {
    const first = new Date(list[0].startsAt)
    return { key, label: DAY.format(first), sub: DATE.format(first), slots: list }
  })
}

/**
 * Picks a 1:1 slot and books it.
 *
 * The slots come from available_slots() in Postgres, which already knows the
 * mentor's weekly rules, their blocked dates, the 12-hour lead time and what is
 * already on their calendar. Deciding any of that here would mean two answers
 * that can disagree.
 */
export function SlotPicker({
  mentorId, mentorName, price, minutes, signedIn,
}: {
  mentorId: string
  mentorName: string
  price: number
  minutes: number
  signedIn: boolean
}) {
  const router = useRouter()
  const [days, setDays] = useState<Day[] | null>(null)
  const [dayKey, setDayKey] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      const { data, error: rpcError } = await createClient().rpc('available_slots', {
        p_mentor: mentorId,
        p_days: 14,
      })
      if (!live) return
      if (rpcError) {
        setError(rpcError.message)
        setDays([])
        return
      }
      const grouped = toDays(
        (data ?? []).map((r: { starts_at: string; ends_at: string }) => ({
          startsAt: r.starts_at,
          endsAt: r.ends_at,
        }))
      )
      setDays(grouped)
      setDayKey(grouped[0]?.key ?? null)
    })()
    return () => {
      live = false
    }
  }, [mentorId])

  const book = useCallback(async () => {
    if (!picked) return
    if (!signedIn) {
      router.push(`/signin?next=${encodeURIComponent(`/mentors/${mentorId}#book`)}`)
      return
    }
    setBusy(true)
    setError(null)
    const { data, error: rpcError } = await createClient().rpc('book_one_on_one', {
      p_mentor: mentorId,
      p_start_at: picked,
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      // Somebody else may have taken it. Re-read rather than leave a stale grid.
      setPicked(null)
      router.refresh()
      return
    }
    router.push(`/checkout/${data}`)
  }, [picked, signedIn, mentorId, router])

  if (days === null) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-muted p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading {mentorName.split(' ')[0]}&rsquo;s slots…
      </div>
    )
  }

  if (days.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-surface-muted p-4 text-center">
        <CalendarClock className="mx-auto size-5 text-subtle-foreground" aria-hidden />
        <p className="mt-2 text-sm font-semibold">No 1:1 slots open right now</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {mentorName.split(' ')[0]} has not published hours for the next two weeks.
          The ₹99 group rooms are still open.
        </p>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    )
  }

  const active = days.find((d) => d.key === dayKey) ?? days[0]

  return (
    <div className="flex flex-col gap-3">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
        Pick a day
      </p>
      <div className="fade-edges -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => {
              setDayKey(d.key)
              setPicked(null)
            }}
            aria-pressed={d.key === active.key}
            className={cn(
              'shrink-0 rounded-[var(--radius-md)] border px-3 py-2 text-center transition-colors',
              d.key === active.key
                ? 'border-cta-1on1 bg-cta-1on1 text-cta-1on1-foreground'
                : 'border-border hover:bg-surface-muted'
            )}
          >
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-wide opacity-80">
              {d.label}
            </span>
            <span className="block text-xs font-bold">{d.sub}</span>
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
        Pick a time · {minutes} mins
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {active.slots.map((s) => (
          <button
            key={s.startsAt}
            type="button"
            onClick={() => setPicked(s.startsAt)}
            aria-pressed={picked === s.startsAt}
            className={cn(
              'rounded-[var(--radius-sm)] border py-2 text-xs font-bold transition-colors',
              picked === s.startsAt
                ? 'border-cta-1on1 bg-cta-1on1 text-cta-1on1-foreground'
                : 'border-border hover:bg-surface-muted'
            )}
          >
            {TIME.format(new Date(s.startsAt))}
          </button>
        ))}
      </div>

      <p className="text-[0.6875rem] text-subtle-foreground">
        Times are in your own timezone.
      </p>

      <Button variant="primary" full size="lg" disabled={!picked || busy} onClick={() => void book()}>
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        {signedIn
          ? picked
            ? `Book ${TIME.format(new Date(picked))} · ${formatINR(price)}`
            : `Book 1:1 · ${formatINR(price)}`
          : 'Sign in to book'}
      </Button>
    </div>
  )
}
