import Link from 'next/link'
import {
  ArrowRight, BadgeIndianRupee, MonitorPlay, RefreshCcw, Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/shared/reveal'
import { CountUp } from '@/components/shared/count-up'
import { HeroVisual } from '@/components/landing/hero-visual'
import { GlyphField } from '@/components/landing/glyph-field'

const CHIPS = [
  { icon: MonitorPlay, label: '100% on-platform video' },
  { icon: RefreshCcw, label: 'Instant refund policy' },
  { icon: BadgeIndianRupee, label: 'No ₹10k/month guru fees' },
]

export function Hero({ mentorCount, sessionCount }: { mentorCount: number; sessionCount: number }) {
  return (
    <section className="aurora relative overflow-hidden border-b border-border bg-surface-muted">
      <div aria-hidden className="bg-grid fade-edges pointer-events-none absolute inset-0" />
      <GlyphField />
      <div className="container-page relative grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div className="flex flex-col items-start gap-5">
          <Reveal>
            <Badge tone="indigo" size="md">
              <Sparkles aria-hidden />
              Built by Tier-3 graduates, for Tier-2 and Tier-3 students
            </Badge>
          </Reveal>

          <Reveal delay={60} as="h1" className="text-[2rem] leading-[1.1] sm:text-5xl md:text-[3.25rem]">
            Learn from someone who was{' '}
            <span className="relative whitespace-nowrap text-primary">
              where you are
              <svg
                viewBox="0 0 300 12" aria-hidden
                className="absolute -bottom-1 left-0 h-2.5 w-full text-[var(--cyan-400)]"
                preserveAspectRatio="none"
              >
                <path d="M2 9C60 3 150 2 298 6" stroke="currentColor" strokeWidth="4"
                      strokeLinecap="round" fill="none" />
              </svg>
            </span>
          </Reveal>

          <Reveal delay={120} as="p"
                  className="max-w-xl text-base leading-relaxed text-muted-foreground">
            Not a coach. Not a course. A senior from a college like yours who already
            did the thing you are trying to do — and will tell you exactly how, in
            your language, for ₹99.
          </Reveal>

          <Reveal delay={180} className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button size="lg" asChild full className="sm:w-auto">
              <Link href="/mentors">
                Find a mentor <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild full className="sm:w-auto">
              <Link href="/sessions">
                <BadgeIndianRupee className="text-accent" aria-hidden />
                Join a ₹99 group session
              </Link>
            </Button>
          </Reveal>

          <Reveal delay={240} as="ul"
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
            {CHIPS.map(({ icon: Icon, label }) => (
              <li key={label}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Icon className="size-4 text-subtle-foreground" aria-hidden />
                {label}
              </li>
            ))}
          </Reveal>

          {(mentorCount > 0 || sessionCount > 0) && (
            <Reveal delay={300} as="dl"
                    className="mt-2 flex gap-8 border-t border-border pt-5">
              {mentorCount > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Verified mentors</dt>
                  <dd className="text-2xl font-extrabold">
                    <CountUp to={mentorCount} />
                  </dd>
                </div>
              )}
              {sessionCount > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Rooms open now</dt>
                  <dd className="text-2xl font-extrabold">
                    <CountUp to={sessionCount} />
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold text-muted-foreground">A group seat</dt>
                <dd className="text-2xl font-extrabold text-accent">₹99</dd>
              </div>
            </Reveal>
          )}
        </div>

        <Reveal delay={200} className="relative hidden lg:block">
          <HeroVisual />
        </Reveal>
      </div>
    </section>
  )
}
