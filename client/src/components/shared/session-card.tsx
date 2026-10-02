import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { isFull, seatsLeft, type GroupSessionSummary } from '@/lib/types'
import { cn, formatINR, formatSessionTime } from '@/lib/utils'

/** Group sessions are the ₹99 path, so every CTA here is amber. */
export function SessionCard({
  session,
  className,
}: {
  session: GroupSessionSummary
  className?: string
}) {
  const left = seatsLeft(session)
  const full = isFull(session)
  const urgent = !full && left <= 3

  return (
    <Card interactive className={cn('flex flex-col', className)}>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <Badge tone={urgent ? 'danger' : full ? 'neutral' : 'green'}>
          {full ? 'Full' : urgent ? `Only ${left} seats left` : `${left} seats left`}
        </Badge>

        <h3 className="text-[0.9375rem] font-bold leading-snug">
          <Link to={`/sessions/${session.id}`} className="hover:text-primary">
            {session.title}
          </Link>
        </h3>

        <p className="line-clamp-2-safe text-[0.8125rem] leading-relaxed text-muted-foreground">
          {session.description}
        </p>

        <dl className="mt-auto flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            <dd>{formatSessionTime(session.startAt)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            <dd>
              {Math.round(
                (new Date(session.endAt).getTime() -
                  new Date(session.startAt).getTime()) /
                  60000
              )}{' '}
              minutes
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 shrink-0" aria-hidden />
            <dd>Max {session.capacity} students</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border-subtle p-4 sm:px-5">
        <Link
          to={`/mentors/${session.mentor.id}`}
          className="flex min-w-0 items-center gap-2 text-xs hover:text-primary"
        >
          <Avatar name={session.mentor.name} src={session.mentor.avatarUrl} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{session.mentor.name}</span>
            <span className="block truncate text-subtle-foreground">
              {session.mentorCompany}
            </span>
          </span>
        </Link>
        <Button variant="group" size="sm" disabled={full} asChild={!full}>
          {full ? (
            <span>Full</span>
          ) : (
            <Link to={`/sessions/${session.id}`}>
              Reserve · {formatINR(session.price)}
            </Link>
          )}
        </Button>
      </div>
    </Card>
  )
}
