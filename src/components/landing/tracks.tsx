import Link from 'next/link'
import {
  ArrowRight, Banknote, BookOpenCheck, GraduationCap, Handshake, RefreshCcw, Sparkles,
} from 'lucide-react'
import { Reveal } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'

/**
 * The two tracks, told apart properly.
 *
 * They were two near-identical pale panels, which made a real fork in the
 * product look like a formatting choice. Track 2 now carries the deep brand
 * gradient — the same language the /join page uses for its second path — so
 * the difference registers before a word is read. The numeral is large enough
 * to act as the label, which lets the small "Track 01" badge go.
 */
const TRACKS = [
  {
    id: 'first_job' as const,
    number: '01',
    tag: 'Most students start here',
    title: 'First job & internship',
    description:
      'The harsh reality of off-campus hiring, cold outreach, and breaking into Tier-1 tech products without elite campus credentials.',
    features: [
      {
        icon: BookOpenCheck,
        title: 'Off-campus DSA & system basics',
        body: 'Only the high-frequency patterns that actually come up in 2026 hiring rounds.',
      },
      {
        icon: RefreshCcw,
        title: 'Service-to-product switch',
        body: 'How to escape the 3.5 LPA mass-recruiter trap inside 12 to 18 months.',
      },
      {
        icon: Sparkles,
        title: 'Resume roast & cold email blueprints',
        body: 'ATS formats and founder outreach templates with a 40% reply rate.',
      },
    ],
  },
  {
    id: 'abroad' as const,
    number: '02',
    tag: 'Pragmatic & honest',
    title: 'Going abroad, without generational wealth',
    description:
      'Realistic guidance for middle-class engineering students chasing a Master’s abroad — no fancy consultants, no commission-driven agents.',
    features: [
      {
        icon: GraduationCap,
        title: 'GRE & IELTS, self-prep',
        body: 'Resources, schedules and practice sets that cost under ₹2,000 in total.',
      },
      {
        icon: Banknote,
        title: 'Collateral-free loans & real ROI',
        body: 'Public banks vs NBFC interest traps, living costs, and surviving the first year.',
      },
      {
        icon: Handshake,
        title: 'Peer university shortlisting',
        body: 'Skip the agents pushing degree mills they get paid to place you in.',
      },
    ],
    disclaimer:
      'Peer experience only. Our mentors do not give legal immigration or visa advice.',
  },
]

export function Tracks() {
  return (
    <section className="band-tint glow-top relative overflow-hidden py-14 md:py-16">
      <div className="container-page relative">
      <Reveal>
        <SectionHeading
          eyebrow="Focused pathways"
          title="Choose your path forward"
          description="Two launch tracks, built around the two bottlenecks Tier-2 and Tier-3 students actually hit."
        />
      </Reveal>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {TRACKS.map((track, i) => {
          const dark = track.id === 'abroad'
          return (
            <Reveal key={track.id} delay={i * 110}>
              <article
                className={`group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] p-6 sm:p-7 ${
                  dark
                    ? 'border border-[var(--navy-800)] text-white'
                    : 'border border-border bg-surface'
                }`}
                style={dark ? { background: 'var(--brand-gradient-deep)' } : undefined}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -right-8 -top-10 select-none text-[7rem] font-extrabold leading-none ${
                    dark ? 'text-white/10' : 'text-primary/[0.07]'
                  }`}
                >
                  {track.number}
                </span>

                <p
                  className={`relative text-xs font-bold uppercase tracking-[0.12em] ${
                    dark ? 'text-[var(--cyan-on-dark)]' : 'text-primary-soft-foreground'
                  }`}
                >
                  {track.tag}
                </p>

                <h3
                  className={`relative mt-2 text-xl leading-tight sm:text-2xl ${dark ? 'text-white' : ''}`}
                >
                  {track.title}
                </h3>

                <p
                  className={`relative mt-2 text-sm leading-relaxed ${
                    dark ? 'text-white/90' : 'text-muted-foreground'
                  }`}
                >
                  {track.description}
                </p>

                <ul className="relative mt-5 flex flex-1 flex-col gap-2.5">
                  {track.features.map(({ icon: Icon, title, body }) => (
                    <li
                      key={title}
                      className={`flex gap-3 rounded-[var(--radius-md)] p-3.5 ${
                        dark ? 'bg-black/20' : 'border border-border bg-surface-muted'
                      }`}
                    >
                      <Icon
                        className={`mt-0.5 size-4 shrink-0 ${dark ? 'text-[var(--cyan-300)]' : 'text-primary'}`}
                        aria-hidden
                      />
                      <div>
                        <p className={`text-[0.8125rem] font-bold ${dark ? 'text-white' : ''}`}>
                          {title}
                        </p>
                        <p
                          className={`mt-0.5 text-xs leading-relaxed ${
                            dark ? 'text-white/90' : 'text-muted-foreground'
                          }`}
                        >
                          {body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                {track.disclaimer && (
                  <p className="relative mt-3 text-[0.6875rem] leading-relaxed text-white/85">
                    {track.disclaimer}
                  </p>
                )}

                <Link
                  href={`/mentors?track=${track.id}`}
                  className={`relative mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-bold transition-colors ${
                    dark
                      ? 'bg-white text-[var(--navy-800)] hover:bg-[var(--cyan-300)]'
                      : 'bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]'
                  }`}
                >
                  See {track.id === 'abroad' ? 'abroad' : 'first-job'} mentors
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </article>
            </Reveal>
          )
        })}
      </div>
      </div>
    </section>
  )
}
