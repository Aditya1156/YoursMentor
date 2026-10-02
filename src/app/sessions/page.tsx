import type { Metadata } from 'next'
import { CalendarDays, Sparkles, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { SessionCard } from '@/components/shared/session-card'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { SessionFiltersBar } from '@/components/sessions/session-filters'
import { listGroupSessions } from '@/lib/queries/sessions'
import type { Track } from '@/lib/types'

export const metadata: Metadata = {
  title: '₹99 group sessions',
  description:
    'Live 45 to 75 minute rooms capped at 15 students, run by seniors who already did what you are trying to do. Ask questions by voice or chat.',
}

type Search = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** P4 — Group sessions list. */
export default async function SessionsPage({
  searchParams,
}: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const track = one(sp.track)
  const when = one(sp.when)

  const now = new Date()
  const to =
    when === 'week' ? new Date(now.getTime() + 7 * 864e5).toISOString()
    : when === 'month' ? new Date(now.getTime() + 30 * 864e5).toISOString()
    : undefined

  let sessions: Awaited<ReturnType<typeof listGroupSessions>> = []
  let failed = false
  try {
    sessions = await listGroupSessions({
      track: (['first_job', 'abroad'] as const).includes(track as Track)
        ? (track as Track) : undefined,
      topic: one(sp.topic) || undefined,
      to,
    })
  } catch {
    failed = true
  }

  const topics = [...new Set(sessions.map((s) => s.topic).filter(Boolean))] as string[]

  return (
    <div className="container-page flex flex-col gap-6 py-8 md:py-10">
      <Card className="bg-accent-soft/40 p-5 sm:p-7">
        <Badge tone="amber" size="md" className="self-start">
          <Sparkles aria-hidden /> High impact · Affordable group learning
        </Badge>
        <h1 className="mt-3 text-2xl sm:text-3xl md:text-[2rem]">₹99 Cohort Rooms</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Interactive 45 to 75 minute live rooms capped at 15 students. Ask questions by
          voice or chat, and keep the mentor&rsquo;s written summary afterwards.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-4 text-accent" aria-hidden /> Max 15 students
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-accent" aria-hidden /> Runs in your browser
          </span>
        </div>
      </Card>

      <SessionFiltersBar topics={topics} />

      {failed ? (
        <ErrorState description="We could not load the session list. Check your connection and try again." />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarDays aria-hidden />}
          title={track || when ? 'No rooms match those filters' : 'The first cohort rooms are being scheduled'}
          description="₹99 gets you a live seat with up to 14 other students from colleges like yours. Create an account and we will email you the moment one opens."
          actionLabel={track || when ? 'Clear filters' : 'Create an account'}
          actionHref={track || when ? '/sessions' : '/signup'}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{sessions.length}</span>{' '}
            {sessions.length === 1 ? 'room' : 'rooms'} open for booking
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </>
      )}
    </div>
  )
}
