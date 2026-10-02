import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/states'
import { LocalTime } from '@/components/shared/local-time'
import { RescheduleControl } from '@/components/bookings/reschedule-control'
import { StartNowButton } from '@/components/bookings/start-now-button'
import { mentorSessions } from '@/lib/queries/mentor-dashboard'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'My sessions' }
export const dynamic = 'force-dynamic'

/** M5 — Mentor sessions. */
export default async function MentorSessionsPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'upcoming' } = await searchParams
  const s = await mentorSessions().catch(
    () => ({ upcoming: [], past: [], cancelled: [], needNotes: [] })
  )

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', items: s.upcoming },
    { id: 'past', label: 'Past', items: s.past },
    { id: 'cancelled', label: 'Cancelled', items: s.cancelled },
  ]
  const active = tabs.find((t) => t.id === tab) ?? tabs[0]!

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">My sessions</h1>
        <Button asChild>
          <Link href="/mentor/sessions/new"><CalendarPlus aria-hidden /> New room</Link>
        </Button>
      </div>

      <nav className="flex gap-1 rounded-[var(--radius-pill)] bg-surface-muted p-1">
        {tabs.map((t) => (
          <a key={t.id} href={`/mentor/sessions?tab=${t.id}`}
             aria-current={t.id === active.id ? 'page' : undefined}
             className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-2 text-sm font-semibold transition-colors ${
               t.id === active.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
             }`}>
            {t.label}
            {t.items.length > 0 && (
              <Badge tone={t.id === active.id ? 'neutral' : 'indigo'}>{t.items.length}</Badge>
            )}
          </a>
        ))}
      </nav>

      {active.items.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus aria-hidden />}
          title={active.id === 'upcoming' ? 'No rooms scheduled' : `Nothing ${active.label.toLowerCase()}`}
          description={active.id === 'upcoming'
            ? 'Students book ₹99 rooms far more readily than 1:1s. It is the easiest way to get your first few sessions.'
            : undefined}
          actionLabel={active.id === 'upcoming' ? 'Create a room' : undefined}
          actionHref={active.id === 'upcoming' ? '/mentor/sessions/new' : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {active.items.map((s) => {
            const short = s.status === 'scheduled' && s.seatsBooked < s.minSeats
            return (
              <li key={s.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={s.type === 'group' ? 'amber' : 'indigo'}>
                        {formatINR(s.price)}
                      </Badge>
                      <Badge tone={short ? 'danger' : s.seatsBooked > 0 ? 'green' : 'neutral'}>
                        {s.seatsBooked}/{s.capacity} booked
                      </Badge>
                      {short && <Badge tone="danger">Needs {s.minSeats - s.seatsBooked} more</Badge>}
                    </div>
                    <h2 className="mt-2 text-[0.9375rem] font-bold">{s.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <LocalTime iso={s.startAt} />
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Only a 1:1 can be renegotiated: there is one student on
                        the other end to agree with. */}
                    {s.type === 'one_on_one'
                      && s.status === 'scheduled'
                      && s.seatsBooked > 0
                      && new Date(s.startAt) > new Date() && (
                      <>
                        <StartNowButton sessionId={s.id} />
                        <RescheduleControl sessionId={s.id} startAt={s.startAt} />
                      </>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/mentor/sessions/${s.id}`}>
                        {active.id === 'past' ? 'Attendance & notes' : 'Manage'}
                      </Link>
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
