import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarPlus, FileText, IndianRupee, Star, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/states'
import { LocalTime } from '@/components/shared/local-time'
import { JoinButton } from '@/components/bookings/join-button'
import { getSessionUser } from '@/lib/session'
import { myMentorApplication } from '@/lib/queries/mentor'
import { mentorEarnings, mentorSessions } from '@/lib/queries/mentor-dashboard'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'Mentor dashboard' }
export const dynamic = 'force-dynamic'

/** M2 — Mentor dashboard. */
export default async function MentorDashboardPage() {
  const [user, profile, sessions, earnings] = await Promise.all([
    getSessionUser(),
    myMentorApplication().catch(() => null),
    mentorSessions().catch(() => ({ upcoming: [], past: [], cancelled: [], needNotes: [] })),
    mentorEarnings().catch(() => ({ rows: [], commission: 25, totalNet: 0, totalGross: 0 })),
  ])

  const next = sessions.upcoming[0]
  const first = user?.name.split(' ')[0] ?? 'there'

  const stats = [
    { label: 'Sessions run', value: sessions.past.length, icon: Users },
    {
      label: 'Rating',
      value: profile && (profile as { ratingCount?: number }).ratingCount
        ? '—' : 'No ratings yet',
      icon: Star,
    },
    { label: 'Earned, all time', value: formatINR(earnings.totalNet), icon: IndianRupee },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">Hello, {first}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your next session, and anything waiting on you.
          </p>
        </div>
        <Button asChild>
          <Link href="/mentor/sessions/new">
            <CalendarPlus aria-hidden /> Create a ₹99 room
          </Link>
        </Button>
      </div>

      {sessions.needNotes.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-accent bg-accent-soft p-4">
          <p className="text-sm font-semibold text-accent-soft-foreground">
            <FileText className="mr-1.5 inline size-4" aria-hidden />
            {sessions.needNotes.length} {sessions.needNotes.length === 1 ? 'session needs' : 'sessions need'} a write-up
          </p>
          <Link href="/mentor/sessions?tab=past" className="text-xs font-bold text-primary hover:underline">
            Write them →
          </Link>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg">Next up</h2>
        {next ? (
          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={next.type === 'group' ? 'amber' : 'indigo'}>
                  {next.type === 'group' ? `Group · ${formatINR(next.price)}` : `1:1 · ${formatINR(next.price)}`}
                </Badge>
                <Badge tone={next.seatsBooked >= next.minSeats ? 'green' : 'danger'}>
                  {next.seatsBooked} of {next.capacity} booked
                </Badge>
              </div>
              <h3 className="mt-2 text-[0.9375rem] font-bold">{next.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                <LocalTime iso={next.startAt} />
              </p>
              {next.seatsBooked < next.minSeats && (
                <p className="mt-1.5 text-xs font-medium text-danger">
                  Needs {next.minSeats - next.seatsBooked} more to run. Below {next.minSeats} it
                  auto-cancels 6 hours before and everyone is refunded.
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <JoinButton sessionId={next.id} startAt={next.startAt} endAt={next.endAt} />
              <Button variant="outline" size="sm" asChild>
                <Link href={`/mentor/sessions/${next.id}`}>Manage</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<CalendarPlus aria-hidden />}
            title="Nothing scheduled"
            description="A ₹99 room of 10 students earns you about ₹742 for an hour. Students book rooms far more readily than 1:1s, so it is the easiest place to start."
            actionLabel="Create a ₹99 room"
            actionHref="/mentor/sessions/new"
          />
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className="size-4 text-subtle-foreground" aria-hidden />
            <p className="mt-3 text-xl font-extrabold leading-none">{s.value}</p>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {sessions.upcoming.length > 1 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg">Also coming up</h2>
            <Link href="/mentor/sessions" className="text-xs font-semibold text-primary hover:underline">
              All sessions →
            </Link>
          </div>
          <Card className="divide-y divide-border-subtle">
            {sessions.upcoming.slice(1, 5).map((s) => (
              <Link key={s.id} href={`/mentor/sessions/${s.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 p-3.5 hover:bg-surface-muted">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{s.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    <LocalTime iso={s.startAt} />
                  </span>
                </span>
                <Badge tone="neutral">{s.seatsBooked}/{s.capacity}</Badge>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}
