import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/states'
import { LocalTime } from '@/components/shared/local-time'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/session'
import { JoinButton } from '@/components/bookings/join-button'
import { StartNowButton } from '@/components/bookings/start-now-button'
import { RescheduleControl } from '@/components/bookings/reschedule-control'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'Sessions', robots: { index: false } }
export const dynamic = 'force-dynamic'

/**
 * Every session on the platform, whoever is hosting it.
 *
 * An admin who hosts a session gets the same controls a mentor does — joining,
 * rejoining, starting early, rescheduling — because for that session they ARE
 * the mentor; ensure_host_profile() gave them a real approved mentor profile
 * rather than inventing a second kind of session.
 *
 * For somebody else's session they get "View" and nothing more. Dropping
 * silently into a stranger's private 1:1 is not a moderation tool, and the
 * token route would refuse it anyway: it wants either the host or a confirmed
 * seat. If a session needs intervening in, that is cancel_session() and a
 * refund, which leaves a record.
 */
export default async function AdminSessionsPage() {
  const me = await getSessionUser()
  const db = createAdminClient()
  const { data } = await db
    .from('sessions')
    .select('*, mentor_profiles!inner(profiles!inner(name))')
    .order('start_at', { ascending: false })
    .limit(60)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const sessions = (data ?? []) as any[]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything scheduled on the platform — yours and every mentor&rsquo;s.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/sessions/new">
            <CalendarPlus aria-hidden /> Create a session
          </Link>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus aria-hidden />}
          title="Nothing scheduled yet"
          description="Create a class yourself, or approve a mentor and let them run one."
          actionLabel="Create a session"
          actionHref="/admin/sessions/new"
        />
      ) : (
        <Card className="divide-y divide-border-subtle">
          {sessions.map((s) => {
            const short = s.status === 'scheduled' && s.seats_booked < s.min_seats
            const hostedByMe = !!me && s.mentor_id === me.id
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={s.type === 'group' ? 'amber' : 'indigo'}>
                      {formatINR(s.price)}
                    </Badge>
                    <Badge tone={
                      s.status === 'cancelled' ? 'danger'
                      : s.status === 'completed' ? 'neutral'
                      : short ? 'danger' : 'green'
                    }>
                      {s.status === 'scheduled'
                        ? `${s.seats_booked}/${s.capacity} booked`
                        : s.status}
                    </Badge>
                    {short && <Badge tone="danger">Under minimum</Badge>}
                    {hostedByMe && <Badge tone="indigo">You host this</Badge>}
                  </div>
                  <p className="mt-1.5 text-sm font-bold">{s.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" aria-hidden />
                      {s.mentor_profiles?.profiles?.name ?? 'Unknown host'}
                    </span>
                    <LocalTime iso={s.start_at} />
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {hostedByMe && s.status === 'scheduled' && (
                    <>
                      <JoinButton sessionId={s.id} startAt={s.start_at} endAt={s.end_at} />
                      {s.type === 'one_on_one' && s.seats_booked > 0
                        && new Date(s.start_at) > new Date() && (
                        <>
                          <StartNowButton sessionId={s.id} />
                          <RescheduleControl sessionId={s.id} startAt={s.start_at} />
                        </>
                      )}
                    </>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/sessions/${s.id}`}>View</Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
