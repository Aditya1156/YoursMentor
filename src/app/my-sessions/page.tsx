import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CalendarCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { BookingRow } from '@/components/bookings/booking-row'
import { myBookingsByTab, creditBalance } from '@/lib/queries/bookings'
import { getSessionUser } from '@/lib/session'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'My sessions' }
export const dynamic = 'force-dynamic'

/** S5 — My sessions. */
export default async function MySessionsPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await getSessionUser()
  if (!viewer) redirect('/signin?next=/my-sessions')

  const { tab = 'upcoming' } = await searchParams

  let grouped: Awaited<ReturnType<typeof myBookingsByTab>> = {
    upcoming: [], past: [], cancelled: [],
  }
  let credits = 0
  let failed = false
  try {
    ;[grouped, credits] = await Promise.all([myBookingsByTab(), creditBalance()])
  } catch {
    failed = true
  }

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', items: grouped.upcoming },
    { id: 'past', label: 'Past', items: grouped.past },
    { id: 'cancelled', label: 'Cancelled', items: grouped.cancelled },
  ]
  const active = tabs.find((t) => t.id === tab) ?? tabs[0]!

  return (
    <div className="container-page flex flex-col gap-5 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">My sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join, cancel and rate everything you have booked.
          </p>
        </div>
        {credits > 0 && (
          <Card className="px-4 py-3">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-subtle-foreground">
              Credit balance
            </p>
            <p className="text-lg font-extrabold text-success">{formatINR(credits)}</p>
          </Card>
        )}
      </div>

      <nav className="flex gap-1 rounded-[var(--radius-pill)] bg-surface-muted p-1" aria-label="Booking status">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`/my-sessions?tab=${t.id}`}
            aria-current={t.id === active.id ? 'page' : undefined}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-3.5 py-2 text-sm font-semibold transition-colors ${
              t.id === active.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.items.length > 0 && (
              <Badge tone={t.id === active.id ? 'neutral' : 'indigo'}>{t.items.length}</Badge>
            )}
          </a>
        ))}
      </nav>

      {failed ? (
        <ErrorState description="We could not load your bookings. Check your connection and try again." />
      ) : active.items.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck aria-hidden />}
          title={
            active.id === 'upcoming' ? 'Nothing booked yet'
            : active.id === 'past' ? 'No sessions behind you yet'
            : 'Nothing cancelled'
          }
          description={
            active.id === 'upcoming'
              ? '₹99 gets you a live seat with a senior who already did what you are trying to do.'
              : 'Sessions you attend will show up here, with the mentor’s notes.'
          }
          actionLabel={active.id === 'upcoming' ? 'Browse ₹99 rooms' : undefined}
          actionHref={active.id === 'upcoming' ? '/sessions' : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {active.items.map((b) => (
            <li key={b.id}>
              <BookingRow booking={b} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
