import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, CalendarDays, Sparkles, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MentorCard } from '@/components/shared/mentor-card'
import { SessionCard } from '@/components/shared/session-card'
import { BookingRow } from '@/components/bookings/booking-row'
import { EmptyState } from '@/components/shared/states'
import { SectionHeading } from '@/components/shared/section-heading'
import { requireStudent } from '@/lib/session'
import { creditBalance, matchedMentors, myBookingsByTab } from '@/lib/queries/bookings'
import { listGroupSessions } from '@/lib/queries/sessions'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'Your dashboard' }
export const dynamic = 'force-dynamic'

/** S2 — Student dashboard. */
export default async function DashboardPage({
  searchParams,
}: { searchParams: Promise<{ matched?: string }> }) {
  const user = await requireStudent('/dashboard')
  if (!user.onboardingComplete) redirect('/onboarding')

  const { matched } = await searchParams

  const [grouped, matches, sessions, credits] = await Promise.all([
    myBookingsByTab().catch(() => ({ upcoming: [], past: [], cancelled: [] })),
    matchedMentors(3).catch(() => []),
    listGroupSessions({ limit: 3 }).catch(() => []),
    creditBalance().catch(() => 0),
  ])

  const next = grouped.upcoming[0]
  const first = user.name.split(' ')[0]

  return (
    <div className="container-page flex flex-col gap-8 py-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl">
            {matched ? `Here are your matches, ${first}` : `Welcome back, ${first}`}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {matched
              ? 'Picked for your college tier, language and home state. Here is why each one came up.'
              : 'Your next session, your matches, and the ₹99 rooms opening soon.'}
          </p>
        </div>
        {credits > 0 && (
          <Card className="flex items-center gap-2.5 px-4 py-3">
            <Wallet className="size-4 text-primary" aria-hidden />
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-subtle-foreground">
                Credits
              </p>
              <p className="text-base font-extrabold text-success">{formatINR(credits)}</p>
            </div>
          </Card>
        )}
      </div>

      {next ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg">Your next session</h2>
            <Link href="/my-sessions" className="text-xs font-semibold text-primary hover:underline">
              All sessions →
            </Link>
          </div>
          <BookingRow booking={next} />
        </section>
      ) : (
        <EmptyState
          icon={<CalendarDays aria-hidden />}
          title="Nothing booked yet"
          description="₹99 gets you a live seat with a senior who already did what you are trying to do."
          actionLabel="Browse ₹99 rooms"
          actionHref="/sessions"
        />
      )}

      {matches.length > 0 && (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <SectionHeading
              align="left"
              eyebrow="Matched to you"
              title="Mentors who walked your road"
            />
            <Button variant="outline" size="sm" asChild>
              <Link href="/mentors">See all mentors <ArrowRight aria-hidden /></Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => <MentorCard key={m.id} mentor={m} />)}
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <SectionHeading
              align="left"
              eyebrow="High impact · affordable"
              title="Upcoming ₹99 cohort rooms"
            />
            <Badge tone="amber" size="md">
              <Sparkles aria-hidden /> Filling fast
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </section>
      )}

      {grouped.past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg">Recently attended</h2>
          <ul className="flex flex-col gap-3">
            {grouped.past.slice(0, 3).map((b) => (
              <li key={b.id}><BookingRow booking={b} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
