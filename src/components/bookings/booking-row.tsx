import Link from 'next/link'
import { CalendarPlus, FileText, Star, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { LocalTime } from '@/components/shared/local-time'
import { CancelBookingButton } from '@/components/bookings/cancel-booking-button'
import { JoinButton } from '@/components/bookings/join-button'
import { RescheduleControl } from '@/components/bookings/reschedule-control'
import { BOOKING_LABEL } from '@/lib/types'
import type { BookingRowData } from '@/lib/queries/bookings'
import { formatINR } from '@/lib/utils'

export function BookingRow({ booking }: { booking: BookingRowData }) {
  const s = booking.session
  const status = BOOKING_LABEL[booking.status]

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          {s.type === 'group' ? (
            <Badge tone="amber">Group · {formatINR(booking.amount)}</Badge>
          ) : (
            <Badge tone="indigo">1:1 · {formatINR(booking.amount)}</Badge>
          )}
        </div>

        <h3 className="mt-2 text-[0.9375rem] font-bold leading-snug">
          <Link href={`/sessions/${s.id}`} className="hover:text-primary">{s.title}</Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Avatar name={s.mentorName} src={s.mentorAvatarUrl} size="sm" />
            {s.mentorName}
          </span>
          <LocalTime iso={s.startAt} />
        </div>

        {booking.status === 'attended' && s.description && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-primary">
              <FileText className="mr-1 inline size-3.5" aria-hidden />
              Mentor&rsquo;s notes and next steps
            </summary>
            <p className="mt-2 rounded-[var(--radius-md)] bg-surface-muted p-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
              {s.description}
            </p>
          </details>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {booking.status === 'held' && (
          <Button variant="group" size="sm" asChild>
            <Link href={`/checkout/${booking.id}`}>Finish payment</Link>
          </Button>
        )}

        {booking.status === 'confirmed' && (
          <>
            <JoinButton sessionId={s.id} startAt={s.startAt} endAt={s.endAt} />
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/bookings/${booking.id}/calendar.ics`} download aria-label="Add to calendar">
                <CalendarPlus aria-hidden />
              </a>
            </Button>
          </>
        )}

        {booking.canCancel && (
          <CancelBookingButton bookingId={booking.id} refundable={booking.refundable} />
        )}

        {/* A 1:1 is two people and a time, so it can be renegotiated. A group
            room cannot: moving it would drag everyone else along. */}
        {s.type === 'one_on_one'
          && booking.status === 'confirmed'
          && new Date(s.startAt) > new Date() && (
          <RescheduleControl sessionId={s.id} startAt={s.startAt} className="w-full sm:w-auto" />
        )}

        {booking.status === 'attended' && !booking.hasReview && (
          <Button variant="primary" size="sm" asChild>
            <Link href={`/rate/${booking.id}`}>
              <Star aria-hidden /> Rate it
            </Link>
          </Button>
        )}

        {booking.status === 'attended' && booking.hasReview && (
          <Badge tone="green">
            <Star aria-hidden /> Rated
          </Badge>
        )}

        {booking.status === 'cancelled_by_mentor' && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/sessions">
              <Video aria-hidden /> Find another
            </Link>
          </Button>
        )}
      </div>
    </Card>
  )
}
