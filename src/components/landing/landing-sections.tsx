import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
  BookOpenCheck,
  Building2,
  CircleDollarSign,
  GraduationCap,
  Handshake,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Users,
  CalendarDays,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Faq } from '@/components/landing/faq'
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

const PROBLEMS = [
  {
    icon: CircleDollarSign,
    title: 'Expensive Industry "Gurus"',
    body: 'Demanding ₹5,000 to ₹10,000 per month on subscription with recycled pre-recorded lectures and zero genuine personalised feedback.',
    answer: '₹99 / session',
    answerNote: 'Zero lock-ins, zero upfront bundles. Pay only for what you attend.',
  },
  {
    icon: Building2,
    title: 'Big-College Detachment',
    body: 'Top-tier college seniors who never experienced campus eco-recruitment, mass recruiters, or sending 400 cold emails to get one interview.',
    answer: 'Relatable Seniors',
    answerNote:
      'Seniors who cracked off-campus placements directly from Tier-2 and Tier-3 colleges.',
  },
  {
    icon: Users,
    title: 'The Network Void',
    body: 'Zero active alumni support on campus. No direct channels for referrals, resume reviews, or honest salary expectations.',
    answer: 'Instant Peer Network',
    answerNote: 'Verified seniors in Bangalore, Hyderabad, Pune and MS graduates abroad.',
  },
]

const TRACKS = [
  {
    id: 'first_job' as const,
    label: 'Track 01',
    tag: 'High Demand',
    tone: 'green' as const,
    title: 'First Job & Internship',
    description:
      'Navigate the harsh reality of off-campus hiring, cold outreach and breaking into Tier-1 tech products without elite campus credentials.',
    features: [
      {
        icon: BookOpenCheck,
        title: 'Off-Campus DSA & System Basics',
        body: 'Focus strictly on high-frequency patterns asked in 2026 hiring rounds.',
      },
      {
        icon: RefreshCcw,
        title: 'Service-to-Product Switch',
        body: 'How to escape the 3.5 LPA mass-recruiter trap within 12 to 18 months.',
      },
      {
        icon: Sparkles,
        title: 'Resume Roast & Cold Email Blueprints',
        body: 'Tested ATS formats and direct founder outreach templates with a 40% reply rate.',
      },
    ],
  },
  {
    id: 'abroad' as const,
    label: 'Track 02',
    tag: 'Pragmatic & Honest',
    tone: 'amber' as const,
    title: 'Going Abroad (Non-Wealthy Perspective)',
    description:
      'Realistic guidance for middle-class engineering students seeking Master’s degrees abroad without generational wealth or fancy consultants.',
    features: [
      {
        icon: GraduationCap,
        title: 'GRE & IELTS Zero-Tuition Self Prep',
        body: 'Resources, schedule sheets and practice sets that cost under ₹2,000 total.',
      },
      {
        icon: Banknote,
        title: 'Collateral-Free Education Loans & ROI',
        body: 'Public banks vs NBFC interest pitfalls, living-cost breakdowns and 1A/9A survival.',
      },
      {
        icon: Handshake,
        title: 'Peer University Shortlisting',
        body: 'Bypass commission-driven agents pushing Tier-4 degree mills.',
      },
    ],
    disclaimer:
      'Peer advice only. YoursMentor mentors do not provide legal immigration or visa consulting.',
  },
]

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

function RealityCheck() {
  return (
    <section className="container-page py-14 md:py-20">
      <Reveal>
      <SectionHeading
        eyebrow="The Reality Check"
        title="Why standard tech mentorship is broken for us"
        description="Students from non-metro engineering colleges don’t need ivory-tower advice. They need tactical, empathetic playbooks that work off-campus."
      />
      </Reveal>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PROBLEMS.map(({ icon: Icon, title, body, answer, answerNote }, i) => (
          <Reveal key={title} delay={i * 90} sheen>
          <Card className="flex h-full flex-col p-5">
            <Icon className="size-5 text-danger" aria-hidden />
            <Badge tone="danger" className="mt-3 self-start">
              Traditional Market
            </Badge>
            <h3 className="mt-2 text-base">{title}</h3>
            <p className="mt-2 flex-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
              {body}
            </p>
            <div className="mt-4 rounded-[var(--radius-md)] bg-surface-muted p-3">
              <p className="flex items-center gap-1.5 text-sm font-bold text-success">
                <ShieldCheck className="size-4" aria-hidden />
                {answer}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {answerNote}
              </p>
            </div>
          </Card>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Tracks() {
  return (
    <section className="container-page py-14 md:py-20">
      <SectionHeading
        eyebrow="Focused Pathways"
        title="Choose Your Path Forward"
        description="Two specialised launch tracks designed specifically for Tier-2 and Tier-3 career bottlenecks."
      />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {TRACKS.map((track, i) => (
          <Reveal key={track.id} delay={i * 110}>
          <Card className="flex h-full flex-col bg-surface-muted p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <Badge tone="indigo" size="md">
                {track.label}
              </Badge>
              <Badge tone={track.tone}>{track.tag}</Badge>
            </div>
            <h3 className="mt-4 text-xl">{track.title}</h3>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
              {track.description}
            </p>

            <ul className="mt-4 flex flex-1 flex-col gap-2.5">
              {track.features.map(({ icon: Icon, title, body }) => (
                <li
                  key={title}
                  className="flex gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-3.5"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-[0.8125rem] font-bold">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {track.disclaimer && (
              <p className="mt-3 text-[0.6875rem] italic leading-relaxed text-subtle-foreground">
                {track.disclaimer}
              </p>
            )}

            <Button variant="soft" full className="mt-4" asChild>
              <Link href={`/mentors?track=${track.id}`}>
                Explore {track.label.replace('0', '')} Mentors <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Card>
          </Reveal>
        ))}
      </div>
    </section>
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


