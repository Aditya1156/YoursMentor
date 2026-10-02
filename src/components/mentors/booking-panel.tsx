'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarClock, Loader2, Users, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'
import { cn, formatINR, formatSessionTime } from '@/lib/utils'

interface GroupOption {
  id: string
  title: string
  startAt: string
  price: number
  seatsLeft: number
}

/**
 * The two booking paths side by side. Blue tab is the paid 1:1, amber tab is
 * the ₹99 group room — the colour carries the meaning, as everywhere else.
 *
 * Booking calls hold_seat() in Postgres, which takes the row lock and decides.
 * The client never writes a booking row.
 */
export function BookingPanel({
  mentorId, mentorName, price, minutes, trialOffer, groupSessions, signedIn,
}: {
  mentorId: string
  mentorName: string
  price: number
  minutes: number
  trialOffer: boolean
  groupSessions: GroupOption[]
  signedIn: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'one_on_one' | 'group'>(
    groupSessions.length && !signedIn ? 'group' : 'one_on_one'
  )
  const [picked, setPicked] = useState<string | null>(groupSessions[0]?.id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reserve(sessionId: string) {
    if (!signedIn) {
      router.push(`/signin?next=${encodeURIComponent(`/mentors/${mentorId}#book`)}`)
      return
    }
    setBusy(true)
    setError(null)
    const { data, error: rpcError } = await createClient()
      .rpc('hold_seat', { p_session: sessionId })
    setBusy(false)

    if (rpcError) {
      setError(rpcError.message)
      router.refresh()   // seat counts have moved
      return
    }
    router.push(`/checkout/${data}`)
  }

  return (
    <Card id="book" className="overflow-hidden">
      <div className="grid grid-cols-2 gap-1 border-b border-border p-1">
        <button
          type="button"
          onClick={() => setTab('one_on_one')}
          aria-pressed={tab === 'one_on_one'}
          className={cn(
            'rounded-[var(--radius-sm)] py-2.5 text-sm font-bold transition-colors',
            tab === 'one_on_one'
              ? 'bg-cta-1on1 text-cta-1on1-foreground'
              : 'text-muted-foreground hover:bg-surface-muted'
          )}
        >
          1:1 Session
        </button>
        <button
          type="button"
          onClick={() => setTab('group')}
          aria-pressed={tab === 'group'}
          disabled={groupSessions.length === 0}
          className={cn(
            'rounded-[var(--radius-sm)] py-2.5 text-sm font-bold transition-colors disabled:opacity-40',
            tab === 'group'
              ? 'bg-cta-group text-cta-group-foreground'
              : 'text-muted-foreground hover:bg-surface-muted'
          )}
        >
          Group (₹99)
        </button>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {error && <ErrorBanner>{error}</ErrorBanner>}

        {tab === 'one_on_one' ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-3xl font-extrabold">
                {formatINR(price)}
                <span className="text-sm font-medium text-muted-foreground"> / {minutes} mins</span>
              </p>
              {trialOffer && <Badge tone="amber"><Zap aria-hidden /> Trial price</Badge>}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Inclusive of all taxes. 100% refund in credits if you cancel more than 24
              hours ahead.
            </p>

            <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-surface-muted p-4 text-center">
              <CalendarClock className="mx-auto size-5 text-subtle-foreground" aria-hidden />
              <p className="mt-2 text-sm font-semibold">Slot picker coming next</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {mentorName.split(' ')[0]} sets weekly availability and we generate 1:1
                slots from it. Until then, the ₹99 group rooms are open.
              </p>
            </div>

            {groupSessions.length > 0 && (
              <Button variant="group" full size="lg" onClick={() => setTab('group')}>
                See the ₹99 group rooms instead
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              Pick a room
            </p>
            <ul className="flex flex-col gap-2">
              {groupSessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(s.id)}
                    aria-pressed={picked === s.id}
                    className={cn(
                      'w-full rounded-[var(--radius-md)] border p-3 text-left transition-colors',
                      picked === s.id
                        ? 'border-accent bg-accent-soft'
                        : 'border-border hover:bg-surface-muted'
                    )}
                  >
                    <p className="text-[0.8125rem] font-bold leading-snug">{s.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatSessionTime(s.startAt)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-success">
                      <Users className="size-3" aria-hidden />
                      {s.seatsLeft} {s.seatsLeft === 1 ? 'seat' : 'seats'} left
                    </p>
                  </button>
                </li>
              ))}
            </ul>

            <Button
              variant="group"
              full
              size="lg"
              disabled={!picked || busy}
              onClick={() => picked && reserve(picked)}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {signedIn ? `Reserve seat · ${formatINR(99)}` : 'Sign in to reserve'}
            </Button>
            <p className="text-center text-[0.6875rem] text-subtle-foreground">
              Your seat is held for 10 minutes while you pay.
            </p>
          </>
        )}

        {!signedIn && (
          <p className="text-center text-xs text-muted-foreground">
            New here?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </Card>
  )
}
