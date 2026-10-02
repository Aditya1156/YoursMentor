import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, Clock, ShieldCheck, Users, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ReserveButton } from '@/components/sessions/reserve-button'
import { LocalTime } from '@/components/shared/local-time'
import { getSession } from '@/lib/queries/sessions'
import { getSessionUser } from '@/lib/session'
import { isFull, seatsLeft, TRACK_LONG } from '@/lib/types'
import { formatINR } from '@/lib/utils'

export async function generateMetadata({
  params,
}: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const s = await getSession(id).catch(() => null)
  if (!s) return { title: 'Session not found' }
  return { title: s.title, description: s.description?.slice(0, 160) }
}

/** P5 — Session detail. */
export default async function SessionDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(id).catch(() => null)
  if (!session) notFound()

  const viewer = await getSessionUser()
  const left = seatsLeft(session)
  const full = isFull(session)
  const minutes = Math.round(
    (new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) / 60000
  )
  const cancelled = session.status === 'cancelled'

  return (
    <div className="container-page py-6 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs">
        <Link href="/sessions" className="font-semibold text-muted-foreground hover:text-primary">
          ← ₹99 Group Sessions
        </Link>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              {cancelled ? (
                <Badge tone="danger">Cancelled</Badge>
              ) : full ? (
                <Badge tone="neutral">Full</Badge>
              ) : left <= 3 ? (
                <Badge tone="danger">Only {left} seats left</Badge>
              ) : (
                <Badge tone="green">{left} seats left</Badge>
              )}
              {session.track && <Badge tone="indigo">{TRACK_LONG[session.track]}</Badge>}
              {session.topic && <Badge tone="outline">{session.topic}</Badge>}
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl">{session.title}</h1>

            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[var(--radius-md)] bg-surface-muted p-3">
                <dt className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-subtle-foreground">
                  <CalendarDays className="size-3.5" aria-hidden /> When
                </dt>
                <dd className="mt-1 text-[0.8125rem] font-semibold">
                  <LocalTime iso={session.startAt} />
                </dd>
              </div>
              <div className="rounded-[var(--radius-md)] bg-surface-muted p-3">
                <dt className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-subtle-foreground">
                  <Clock className="size-3.5" aria-hidden /> Duration
                </dt>
                <dd className="mt-1 text-[0.8125rem] font-semibold">{minutes} minutes</dd>
              </div>
              <div className="rounded-[var(--radius-md)] bg-surface-muted p-3">
                <dt className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-subtle-foreground">
                  <Users className="size-3.5" aria-hidden /> Room size
                </dt>
                <dd className="mt-1 text-[0.8125rem] font-semibold">
                  Max {session.capacity} students
                </dd>
              </div>
            </dl>

            {session.description && (
              <div className="mt-5">
                <h2 className="text-base">What you&rsquo;ll learn</h2>
                <div className="mt-2 flex flex-col gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  {session.description.split('\n').filter(Boolean).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-base">Your mentor</h2>
            <Link
              href={`/mentors/${session.mentorId}`}
              className="mt-3 flex items-center gap-3 rounded-[var(--radius-md)] p-2 hover:bg-surface-muted"
            >
              <Avatar name={session.mentorName} src={session.mentorAvatarUrl} size="lg" />
              <div>
                <p className="text-sm font-bold">{session.mentorName}</p>
                <p className="text-xs text-primary">{session.mentorCompany ?? 'Verified mentor'}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">View full profile →</p>
              </div>
            </Link>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <p className="text-3xl font-extrabold">{formatINR(session.price)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Inclusive of all taxes. One seat, one student.
            </p>

            <div className="mt-4">
              <ReserveButton
                sessionId={session.id}
                price={session.price}
                disabled={full || cancelled}
                label={cancelled ? 'Session cancelled' : full ? 'Room is full' : undefined}
                signedIn={!!viewer}
              />
            </div>

            <ul className="mt-4 flex flex-col gap-2.5 text-xs leading-relaxed text-muted-foreground">
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden />
                Cancel more than 24 hours ahead for a full refund in credits. Under 24
                hours there is no refund.
              </li>
              <li className="flex items-start gap-2">
                <Users className="mt-px size-4 shrink-0 text-primary" aria-hidden />
                If fewer than {session.minSeats} students join, we cancel it 6 hours ahead
                and refund everyone automatically.
              </li>
              <li className="flex items-start gap-2">
                <Video className="mt-px size-4 shrink-0 text-primary" aria-hidden />
                Runs in your browser. Audio-only mode for weak mobile data.
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  )
}
