import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { LocalTime } from '@/components/shared/local-time'
import { ReviewForm } from '@/components/bookings/review-form'
import { createClient } from '@/lib/supabase/server'
import { requireStudent } from '@/lib/session'

export const metadata: Metadata = { title: 'Rate your session', robots: { index: false } }
export const dynamic = 'force-dynamic'

/**
 * S7 — rating a session.
 *
 * complete_finished_sessions() has been sending students here since the cron
 * was wired up, and the page did not exist: the notification linked to a 404.
 * Ratings also order the mentor directory, so without this rating_avg never
 * moved off its seeded value.
 *
 * RLS scopes the booking read to the caller, so a student cannot open someone
 * else's. leave_review() checks it again — that the booking is theirs and was
 * attended — because a page guard is a courtesy and the database is the rule.
 */
export default async function RatePage({
  params,
}: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  await requireStudent(`/rate/${bookingId}`)

  const supabase = await createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status,
      sessions!inner (
        title, start_at, end_at,
        mentor_profiles!inner ( headline, profiles!inner ( name, avatar_url ) )
      )
    `)
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking) redirect('/my-sessions')

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const session = (booking as any).sessions
  const mentor = session.mentor_profiles
  const mentorName: string = mentor.profiles.name
  const mentorAvatar: string | undefined = mentor.profiles.avatar_url ?? undefined
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Already reviewed? The unique constraint on booking_id would refuse a second
  // one, so say so here rather than letting someone write it out first.
  const { data: existing } = await supabase
    .from('reviews')
    .select('id, rating')
    .eq('booking_id', bookingId)
    .maybeSingle()

  const shell = (children: React.ReactNode) => (
    <div className="container-page max-w-lg py-8 md:py-12">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Avatar name={mentorName} src={mentorAvatar} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{mentorName}</p>
            <p className="truncate text-xs text-muted-foreground">{mentor.headline}</p>
          </div>
        </div>
        <h1 className="mt-4 text-xl leading-snug">{session.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          <LocalTime iso={session.start_at} />
        </p>
        <div className="mt-6">{children}</div>
      </Card>
    </div>
  )

  if (existing) {
    return shell(
      <div className="text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="size-5 text-success" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-semibold">
          You already rated this {existing.rating} out of 5
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Reviews stay as written so mentors cannot ask anyone to soften one.
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/my-sessions?tab=past">Back to my sessions</Link>
        </Button>
      </div>
    )
  }

  // 'attended' is set by the mentor marking attendance, or by the cron
  // completing a finished session. Before that there is nothing to rate.
  if (booking.status !== 'attended') {
    return shell(
      <div className="text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-surface-muted">
          <Clock className="size-5 text-subtle-foreground" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-semibold">This one is not ready to rate yet</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {booking.status === 'confirmed'
            ? 'You can rate it once the session has happened.'
            : `This booking is ${booking.status.replace(/_/g, ' ')}.`}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/my-sessions">Back to my sessions</Link>
        </Button>
      </div>
    )
  }

  return shell(<ReviewForm bookingId={bookingId} mentorName={mentorName} />)
}
