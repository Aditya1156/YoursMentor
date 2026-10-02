import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeIndianRupee,
  Banknote,
  BookOpenCheck,
  Building2,
  CircleDollarSign,
  GraduationCap,
  Handshake,
  MonitorPlay,
  Quote,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SectionHeading } from '@/components/shared/section-heading'
import { MentorCard } from '@/components/shared/mentor-card'
import { SessionCard } from '@/components/shared/session-card'
import { Avatar } from '@/components/ui/avatar'
import { MOCK_MENTORS, MOCK_SESSIONS } from '@/lib/mock-data'

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
      'Peer advice only. OneStep mentors do not provide legal immigration or visa consulting.',
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

const FAQS = [
  {
    q: 'What if the mentor doesn’t show up or the session is unhelpful?',
    a: 'If a mentor does not join within 10 minutes, report it from the session page and we refund you in full. Mentors who miss sessions collect strikes and are suspended after three. If a session was genuinely unhelpful, tell us within 48 hours and our team reviews it.',
  },
  {
    q: 'Do I need to install Zoom or Google Meet?',
    a: 'No. Every session runs inside OneStep in your browser — Chrome or Edge on a phone or laptop is enough. There is an audio-only mode for weak mobile data, and we never ask you to move to a mentor’s personal link.',
  },
  {
    q: 'How are mentors vetted on OneStep?',
    a: 'Mentors are invite-only right now. Every applicant is reviewed by a person against their LinkedIn profile and a college or company ID before they can be listed, and each one signs our code of conduct. The verified badge on a profile means a human checked it.',
  },
  {
    q: 'Can I talk to mentors in Hindi or other regional languages?',
    a: 'Yes. Every mentor lists the languages they are comfortable in — Hindi, Kannada, Marathi, Bengali, Urdu, Telugu and more — and you can filter the directory by language before you book.',
  },
  {
    q: 'What does ₹99 actually get me?',
    a: 'A seat in a live group session of up to 15 students with a mentor who has done the thing you are trying to do. You can ask questions by voice or chat, and you get the mentor’s written summary and next steps afterwards.',
  },
  {
    q: 'What is your refund and cancellation policy?',
    a: 'Cancel 24 hours or more before a session and you get the full amount back as OneStep credits. Under 24 hours there is no refund. If the mentor cancels, or a group session does not reach its minimum of 3 students, you are refunded in full automatically.',
  },
  {
    q: 'Who can sign up?',
    a: 'OneStep is open to students aged 18 and over for now. We are building a proper parental-consent flow before we open to younger students, because India’s data protection law requires it.',
  },
  {
    q: 'How do I become a mentor?',
    a: 'Apply from the Become a Mentor page with your LinkedIn and a college or company ID. We review applications within 48 hours. You set your own availability and your 1:1 price between ₹99 and ₹499, and keep 75% of what you earn.',
  },
]

const TRUST_CHIPS = [
  { icon: MonitorPlay, label: '100% On-Platform Video' },
  { icon: RefreshCcw, label: 'Instant Refund Policy' },
  { icon: BadgeIndianRupee, label: 'No ₹10k/month Guru Fees' },
]

/* ── page ────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <Hero />
      <RealityCheck />
      <Tracks />
      <FeaturedMentors />
      <UpcomingCohorts />
      <HowItWorks />
      <Faq />
      <FounderNote />
    </>
  )
}

function Hero() {
  return (
    <section className="bg-surface-muted">
      <div className="container-page flex flex-col items-center gap-6 py-12 text-center sm:py-16 md:py-20">
        <Badge tone="indigo" size="md">
          <Sparkles aria-hidden />
          Over 2,400+ students guided from Tier-2 &amp; Tier-3 colleges across India
        </Badge>

        <h1 className="max-w-4xl text-[1.75rem] leading-[1.15] sm:text-4xl md:text-5xl md:leading-[1.1]">
          Learn from someone who was where you are —{' '}
          <span className="text-primary">one step ahead.</span>
        </h1>

        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Connect with relatable seniors from similar college tiers, hometowns and
          languages. Book affordable ₹99 group sessions or focused 1:1 guidance with zero
          fluff.
        </p>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button size="lg" asChild full className="sm:w-auto">
            <Link to="/mentors">
              Find a Mentor <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild full className="sm:w-auto">
            <Link to="/sessions">
              <BadgeIndianRupee className="text-accent" aria-hidden />
              Join a ₹99 Group Session
            </Link>
          </Button>
        </div>

        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2">
          {TRUST_CHIPS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
            >
              <Icon className="size-4 text-subtle-foreground" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function RealityCheck() {
  return (
    <section className="container-page py-14 md:py-20">
      <SectionHeading
        eyebrow="The Reality Check"
        title="Why standard tech mentorship is broken for us"
        description="Students from non-metro engineering colleges don’t need ivory-tower advice. They need tactical, empathetic playbooks that work off-campus."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PROBLEMS.map(({ icon: Icon, title, body, answer, answerNote }) => (
          <Card key={title} className="flex flex-col p-5">
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
        {TRACKS.map((track) => (
          <Card key={track.id} className="flex flex-col bg-surface-muted p-5 sm:p-6">
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
              <Link to={`/mentors?track=${track.id}`}>
                Explore {track.label.replace('0', '')} Mentors <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Card>
        ))}
      </div>
    </section>
  )
}

function FeaturedMentors() {
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
          <Link to="/mentors">
            All Mentors <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_MENTORS.slice(0, 3).map((m) => (
          <MentorCard key={m.id} mentor={m} />
        ))}
      </div>
    </section>
  )
}

function UpcomingCohorts() {
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
          <Badge tone="green" size="md" className="shrink-0">
            {MOCK_SESSIONS.length} sessions filling fast
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_SESSIONS.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>

        <Button variant="outline" full className="mt-5" asChild>
          <Link to="/sessions">
            See all ₹99 group sessions <ArrowRight aria-hidden />
          </Link>
        </Button>
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
        {STEPS.map(({ n, tone, title, body }) => (
          <li key={n}>
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
          </li>
        ))}
      </ol>
    </section>
  )
}

function Faq() {
  return (
    <section className="container-page py-14 md:py-20">
      <SectionHeading
        eyebrow="Answers Upfront"
        title="Frequently Asked Questions"
        description="Everything you need to know before booking your first session."
      />
      <Accordion
        type="single"
        collapsible
        className="mx-auto mt-8 flex max-w-3xl flex-col gap-2.5"
      >
        {FAQS.map(({ q, a }, i) => (
          <AccordionItem key={q} value={`faq-${i}`}>
            <AccordionTrigger>{q}</AccordionTrigger>
            <AccordionContent>{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}

function FounderNote() {
  return (
    <section className="container-page pb-6 pt-4 md:pb-10">
      <Card className="bg-primary-soft p-5 sm:p-8">
        <Quote className="size-7 text-primary opacity-40" aria-hidden />
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-start md:gap-7">
          <div className="flex shrink-0 flex-col items-start gap-2 md:w-44">
            <Avatar name="Aditya" size="xl" />
            <p className="text-sm font-bold">Aditya</p>
            <a
              href="https://youtube.com/@refactorslife"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline"
            >
              @refactorslife
            </a>
          </div>

          <div className="flex-1">
            <blockquote className="flex flex-col gap-3 text-sm leading-relaxed text-ink-700">
              <p>
                &ldquo;I graduated from a private engineering college where mass recruiters
                offered 3.25 LPA, and teachers told us that off-campus FAANG or Tier-1
                product jobs were only meant for IITians. It was a complete lie.&rdquo;
              </p>
              <p>
                &ldquo;OneStep was built with close friends for every student sitting in a
                hostel room right now who feels anxious, left out or invisible. You don’t
                need a ₹50,000 bootcamp. You just need a senior who has travelled that exact
                road to say:{' '}
                <em className="font-semibold not-italic text-foreground">
                  here is the exact step I took. You can do this too.
                </em>
                &rdquo;
              </p>
            </blockquote>
            <Button className="mt-5" asChild>
              <Link to="/mentors">
                <Video aria-hidden /> Find your senior today
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
