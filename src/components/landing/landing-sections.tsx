import Link from 'next/link'
import { ArrowRight, Sparkles, Users, CalendarDays } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Faq } from '@/components/landing/faq'
import { RealityCheck } from '@/components/landing/reality-check'
import { Tracks } from '@/components/landing/tracks'
import { Hero } from '@/components/landing/hero'
import { TrustStrip } from '@/components/landing/trust-strip'
import { FounderVideo } from '@/components/landing/founder-video'
import { Reveal } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { MentorCard } from '@/components/shared/mentor-card'
import { SessionCard } from '@/components/shared/session-card'
import { EmptyState } from '@/components/shared/states'
import type { MentorSummary, SessionSummary } from '@/lib/types'

/* ── section content ─────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: 1,
    tone: 'indigo' as const,
    title: 'Take the 2-Min Match Quiz',
    body: 'Select your college tier, your current target role (SDE, Frontend, Data, MS abroad) and your preferred speaking language.',
  },
  {
    n: 2,
    tone: 'amber' as const,
    title: 'Connect With Your Senior',
    body: 'Pick a 1:1 slot or join a ₹99 cohort workshop. Transparent pricing with clear agendas defined in advance.',
  },
  {
    n: 3,
    tone: 'green' as const,
    title: 'Join In-Browser Video',
    body: 'Hop on 100% on-platform video calls right from Chrome or Edge. Screen share your resume, code or SOP draft with zero friction.',
  },
]


/* ── page ────────────────────────────────────────────────────────────────── */

export function LandingSections({
  mentors,
  sessions,
  founderVideoId,
}: {
  mentors: MentorSummary[]
  sessions: SessionSummary[]
  founderVideoId?: string
}) {
  return (
    <>
      <Hero mentorCount={mentors.length} sessionCount={sessions.length} />
      <TrustStrip />
      <RealityCheck />
      <Tracks />
      <FeaturedMentors mentors={mentors} />
      <UpcomingCohorts sessions={sessions} />
      <HowItWorks />
      <Faq />
      <FounderVideo videoId={founderVideoId} />
    </>
  )
}

function FeaturedMentors({ mentors }: { mentors: MentorSummary[] }) {
  return (
    <section className="container-page py-14 md:py-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          align="left"
          eyebrow="Verified Near-Peers"
          title="Meet Mentors Who Walked Your Road"
          description="Zero IIT/BITS elitism. Real people from state universities and Tier-3 colleges who cracked the off-campus code."
        />
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href="/mentors">
            All Mentors <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      {mentors.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mentors.map((m, i) => (
            <Reveal key={m.id} delay={i * 90}>
              <MentorCard mentor={m} className="h-full" />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            icon={<Users aria-hidden />}
            title="Our first mentors are being verified right now"
            description="Every mentor is reviewed by a person before they appear here. Join the list and we will tell you the moment the first sessions open."
          />
        </div>
      )}
    </section>
  )
}

function UpcomingCohorts({ sessions }: { sessions: SessionSummary[] }) {
  return (
    <section className="container-page py-14 md:py-20">
      <Card className="bg-accent-soft/40 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Badge tone="amber" size="md" className="self-start">
              <Sparkles aria-hidden />
              High Impact · Affordable Group Learning
            </Badge>
            <h2 className="text-2xl sm:text-3xl">Upcoming ₹99 Cohort Rooms</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Interactive 45 to 75 minute live rooms capped at 15 students. Ask live
              questions in voice or chat.
            </p>
          </div>
          {sessions.length > 0 && (
            <Badge tone="green" size="md" className="shrink-0">
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} filling fast
            </Badge>
          )}
        </div>

        {sessions.length ? (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((s, i) => (
                <Reveal key={s.id} delay={i * 90}>
                  <SessionCard session={s} className="h-full" />
                </Reveal>
              ))}
            </div>
            <Button variant="outline" full className="mt-5" asChild>
              <Link href="/sessions">
                See all ₹99 group sessions <ArrowRight aria-hidden />
              </Link>
            </Button>
          </>
        ) : (
          <div className="mt-6">
            <EmptyState
              icon={<CalendarDays aria-hidden />}
              title="The first cohort rooms are being scheduled"
              description="₹99 gets you a live seat with up to 14 other students. Create an account and we will email you when the first one opens."
              actionLabel="Create an account"
              actionHref="/join"
            />
          </div>
        )}
      </Card>
    </section>
  )
}

function HowItWorks() {
  const toneClass = {
    indigo: 'bg-primary-soft text-primary-soft-foreground',
    amber: 'bg-accent-soft text-accent-soft-foreground',
    green: 'bg-success-soft text-success',
  }
  return (
    <section className="container-page py-14 md:py-20">
      <SectionHeading
        eyebrow="Smooth & Transparent"
        title="Get Real Guidance in 3 Simple Steps"
        description="No sales rep calling you. No loan agreements. Start learning within minutes."
      />
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {STEPS.map(({ n, tone, title, body }, i) => (
          <li key={n}>
            <Reveal delay={i * 110}>
            <Card className="h-full p-5">
              <span
                className={`flex size-9 items-center justify-center rounded-[var(--radius-md)] text-base font-extrabold ${toneClass[tone]}`}
              >
                {n}
              </span>
              <h3 className="mt-3 text-base">{title}</h3>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                {body}
              </p>
            </Card>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  )
}


