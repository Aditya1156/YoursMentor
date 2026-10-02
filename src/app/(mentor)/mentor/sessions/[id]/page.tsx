import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LocalTime } from '@/components/shared/local-time'
import { JoinButton } from '@/components/bookings/join-button'
import { SessionManager } from '@/components/mentor/session-manager'
import { getSession } from '@/lib/queries/sessions'
import { sessionAttendees, sessionTiming } from '@/lib/queries/mentor-dashboard'
import { getSessionUser } from '@/lib/session'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'Manage session' }
export const dynamic = 'force-dynamic'

export default async function ManageSessionPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [session, user] = await Promise.all([
    getSession(id).catch(() => null),
    getSessionUser(),
  ])
  if (!session || session.mentorId !== user?.id) notFound()

  const [attendees, timing] = await Promise.all([
    sessionAttendees(id).catch(() => []),
    sessionTiming(session.startAt),
  ])

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <nav className="text-xs">
        <Link href="/mentor/sessions" className="font-semibold text-muted-foreground hover:text-primary">
          ← My sessions
        </Link>
      </nav>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={session.type === 'group' ? 'amber' : 'indigo'}>
            {formatINR(session.price)} per seat
          </Badge>
          <Badge tone={session.seatsBooked >= session.minSeats ? 'green' : 'danger'}>
            <Users aria-hidden /> {session.seatsBooked} of {session.capacity}
          </Badge>
          {session.status !== 'scheduled' && <Badge tone="neutral">{session.status}</Badge>}
        </div>

        <h1 className="mt-3 text-xl">{session.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <LocalTime iso={session.startAt} />
        </p>

        {session.status === 'scheduled' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <JoinButton sessionId={session.id} startAt={session.startAt} endAt={session.endAt} />
            {session.seatsBooked === 0 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/mentor/sessions/${session.id}/edit`}>Edit details</Link>
              </Button>
            )}
          </div>
        )}
      </Card>

      <SessionManager
        sessionId={session.id}
        status={session.status}
        started={timing.started}
        notes={session.description ?? ''}
        attendees={attendees}
        seatsBooked={session.seatsBooked}
        startsInHours={timing.startsInHours}
      />
    </div>
  )
}
