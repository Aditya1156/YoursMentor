import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CalendarPlus, CheckCircle2, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { LocalTime } from '@/components/shared/local-time'
import { getBooking } from '@/lib/queries/bookings'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Seat confirmed' }
export const dynamic = 'force-dynamic'

/** S4 — Booking confirmed. */
export default async function ConfirmedPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await getSessionUser()
  if (!viewer) redirect('/signin')

  const booking = await getBooking(id).catch(() => null)
  if (!booking) notFound()

  const s = booking.session

  return (
    <div className="container-page max-w-2xl py-10 md:py-16">
      <Card className="p-6 text-center sm:p-8">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="size-6 text-success" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl">You&rsquo;re in</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your seat is confirmed. We&rsquo;ve sent the details to your email.
        </p>

        <div className="mt-6 rounded-[var(--radius-lg)] bg-surface-muted p-4 text-left">
          <h2 className="text-base">{s.title}</h2>
          <div className="mt-3 flex items-center gap-2.5">
            <Avatar name={s.mentorName} src={s.mentorAvatarUrl} size="sm" />
            <div className="text-xs">
              <p className="font-semibold">{s.mentorName}</p>
              <p className="text-muted-foreground"><LocalTime iso={s.startAt} /></p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" full asChild>
            <a href={`/api/bookings/${booking.id}/calendar.ics`} download>
              <CalendarPlus aria-hidden /> Add to calendar
            </a>
          </Button>
          <Button full asChild>
            <Link href="/my-sessions">
              <Video aria-hidden /> My sessions
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="mt-4 p-5 text-left">
        <h2 className="text-base">Before you join</h2>
        <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Open the session from <strong className="text-foreground">My sessions</strong> — the join button appears 10 minutes before the start.</li>
          <li>Chrome or Edge on a phone or laptop is enough. There is nothing to install.</li>
          <li>On weak mobile data, switch on audio-only mode inside the room.</li>
          <li>Write down the one question you most want answered. Rooms move fast.</li>
        </ul>
      </Card>
    </div>
  )
}
