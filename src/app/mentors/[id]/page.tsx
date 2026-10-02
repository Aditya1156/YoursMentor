import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  BadgeCheck, CalendarDays, Flag, Quote, ShieldCheck, Sparkles, Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { StarRating } from '@/components/shared/star-rating'
import { SessionCard } from '@/components/shared/session-card'
import { BookingPanel } from '@/components/mentors/booking-panel'
import { getMentor, getMentorReviews } from '@/lib/queries/mentors'
import { mentorGroupSessions } from '@/lib/queries/sessions'
import { getSessionUser } from '@/lib/session'
import { TIER_LABEL, TRACK_LONG } from '@/lib/types'
import { formatINR } from '@/lib/utils'

export async function generateMetadata({
  params,
}: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const mentor = await getMentor(id).catch(() => null)
  if (!mentor) return { title: 'Mentor not found' }
  return {
    title: `${mentor.name} — ${mentor.headline}`,
    description:
      mentor.breakthroughStory ??
      `Book a 1:1 with ${mentor.name}, ${mentor.headline}, from ${formatINR(mentor.price1on1)}.`,
  }
}

/** P3 — Mentor profile. */
export default async function MentorProfilePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mentor = await getMentor(id).catch(() => null)
  if (!mentor) notFound()

  const [reviews, groupSessions, viewer] = await Promise.all([
    getMentorReviews(id).catch(() => []),
    mentorGroupSessions(id).catch(() => []),
    getSessionUser(),
  ])

  return (
    <div className="container-page py-6 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs">
        <Link href="/mentors" className="font-semibold text-muted-foreground hover:text-primary">
          ← Find Mentors
        </Link>
        <span className="text-subtle-foreground">/</span>
        <span className="font-semibold">{mentor.name}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* ---------------------------------------------------- main column */}
        <div className="flex flex-col gap-5">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Avatar name={mentor.name} src={mentor.avatarUrl} size="xl" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl">{mentor.name}</h1>
                  <BadgeCheck className="size-5 text-primary" aria-label="Verified mentor" />
                </div>
                <p className="mt-1 text-sm font-semibold text-primary">{mentor.headline}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {mentor.ratingCount > 0 && (
                    <StarRating value={mentor.ratingAvg} count={mentor.ratingCount} />
                  )}
                  {mentor.sessionsCompleted > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden />
                      {mentor.sessionsCompleted}+ sessions guided
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {mentor.collegeTier && (
                    <Badge tone="indigo">
                      {TIER_LABEL[mentor.collegeTier]} College
                      {mentor.homeState ? ` · ${mentor.homeState}` : ''}
                    </Badge>
                  )}
                  {mentor.firstGenGraduate && (
                    <Badge tone="amber"><Sparkles aria-hidden /> First-Gen Graduate</Badge>
                  )}
                  {mentor.languages.length > 0 && (
                    <Badge tone="neutral">Speaks {mentor.languages.join(', ')}</Badge>
                  )}
                  {mentor.tracks.map((t) => (
                    <Badge key={t} tone="green">{TRACK_LONG[t]}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {(mentor.story || mentor.breakthroughStory) && (
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg">
                  <Quote className="size-4 text-primary" aria-hidden /> My journey
                </h2>
                <span className="eyebrow">Real story</span>
              </div>
              {mentor.breakthroughStory && (
                <p className="mt-3 rounded-[var(--radius-md)] bg-primary-soft p-3.5 text-sm font-medium leading-relaxed">
                  &ldquo;{mentor.breakthroughStory}&rdquo;
                </p>
              )}
              {mentor.story && (
                <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
                  {mentor.story.split('\n').filter(Boolean).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
            </Card>
          )}

          {mentor.topics.length > 0 && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg">What we can cover in a 1:1</h2>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {mentor.topics.map((t) => (
                  <div key={t} className="rounded-[var(--radius-md)] border border-border bg-surface-muted p-3.5">
                    <p className="text-[0.8125rem] font-bold">{t}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {groupSessions.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg">Upcoming ₹99 group sessions</h2>
                <Badge tone="amber">Budget friendly</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {groupSessions.map((s) => <SessionCard key={s.id} session={s} />)}
              </div>
            </section>
          )}

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg">
              Student reviews{mentor.ratingCount > 0 ? ` (${mentor.ratingCount})` : ''}
            </h2>
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                No written reviews yet. {mentor.name.split(' ')[0]} was verified by our team
                against their LinkedIn and a workplace ID before being listed.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-4">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-border-subtle pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Avatar name={r.studentName} src={r.studentAvatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-bold">{r.studentName}</p>
                          <StarRating value={r.rating} />
                        </div>
                        {r.studentCollege && (
                          <p className="text-xs text-subtle-foreground">{r.studentCollege}</p>
                        )}
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          &ldquo;{r.comment}&rdquo;
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ------------------------------------------------- booking column */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <BookingPanel
            mentorId={mentor.id}
            mentorName={mentor.name}
            price={mentor.price1on1}
            minutes={mentor.session1on1Minutes}
            trialOffer={mentor.trialOffer}
            groupSessions={groupSessions.map((s) => ({
              id: s.id, title: s.title, startAt: s.startAt,
              price: s.price, seatsLeft: s.capacity - s.seatsBooked,
            }))}
            signedIn={!!viewer}
          />

          <Card className="mt-4 p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden />
              <span>
                <strong className="font-bold text-foreground">Student Shield.</strong>{' '}
                Free cancellation up to 24h before. If the mentor is a no-show, you are
                refunded in full.
              </span>
            </p>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <CalendarDays className="mt-px size-4 shrink-0 text-primary" aria-hidden />
              <span>Sessions run in your browser. No app to install.</span>
            </p>
            <Link
              href={`/report?type=user&id=${mentor.id}`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-subtle-foreground hover:text-danger"
            >
              <Flag className="size-3.5" aria-hidden /> Report this profile
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  )
}
