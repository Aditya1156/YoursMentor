import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight, BadgeCheck, CalendarCheck, GraduationCap, IndianRupee,
  MessagesSquare, Sparkles, Users, Video,
} from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { getSessionUser, homeFor } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Join YoursMentor.in',
  description:
    'Learn from someone who was where you are, or help someone who is where you were. Pick your side and get started in two minutes.',
}

/**
 * The fork. Student and mentor are genuinely different products — different
 * onboarding, different surfaces, different reason to be here — so the choice
 * gets a page rather than a pair of radio buttons above a form.
 *
 * The two sides are told apart by weight, not by hue: the student panel is
 * light and the mentor panel is the logo's deep navy. Amber is not used here,
 * because amber means a ₹99 group seat everywhere else in the product and
 * borrowing it would blunt that.
 */
export default async function JoinPage() {
  const user = await getSessionUser()
  if (user) redirect(homeFor(user))

  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      <div className="container-page flex flex-col items-center gap-2 pt-8 text-center md:pt-12">
        <h1 className="text-[1.75rem] leading-tight sm:text-4xl">
          Which side are you on?
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Both take about two minutes to set up. You can switch later — plenty of
          students end up mentoring the year below them.
        </p>
      </div>

      <div className="container-page grid gap-4 py-8 md:py-10 lg:grid-cols-2">
        {/* ------------------------------------------------------- student */}
        <Link
          href="/signup"
          className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface p-6 transition-all hover:border-primary hover:shadow-[var(--shadow-pop)] sm:p-8"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-primary-soft opacity-60 transition-transform duration-500 group-hover:scale-125"
          />

          <span className="relative flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-primary text-primary-foreground">
            <GraduationCap className="size-7" aria-hidden />
          </span>

          <h2 className="relative mt-5 text-2xl sm:text-[1.75rem]">I&rsquo;m a student</h2>
          <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
            Talk to someone one to three steps ahead of you — same college tier, same
            home state, same language. No ivory-tower advice.
          </p>

          <ul className="relative mt-6 flex flex-col gap-3">
            {[
              { icon: IndianRupee, text: '₹99 group rooms, or 1:1 from ₹99' },
              { icon: Sparkles, text: 'A 2-minute quiz finds mentors like you' },
              { icon: Video, text: 'Runs in your browser, audio-only if data is tight' },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-2.5 text-sm">
                <f.icon className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-muted-foreground">{f.text}</span>
              </li>
            ))}
          </ul>

          <span className="relative mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors group-hover:bg-[var(--primary-hover)]">
            Find my mentor
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>

          <p className="relative mt-3 text-xs text-subtle-foreground">
            Free to join. You only pay when you book.
          </p>
        </Link>

        {/* -------------------------------------------------------- mentor */}
        <Link
          href="/signup?role=mentor"
          className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--navy-800)] p-6 text-white transition-all hover:shadow-[var(--shadow-pop)] sm:p-8"
          style={{ background: 'var(--brand-gradient-deep)' }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-125"
          />

          <span className="relative flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-white/15 backdrop-blur">
            <Users className="size-7" aria-hidden />
          </span>

          <h2 className="relative mt-5 text-2xl text-white sm:text-[1.75rem]">
            I want to mentor
          </h2>
          <p className="relative mt-2 text-sm leading-relaxed text-white/90">
            You already worked out the thing someone two years behind you is stuck on.
            An hour of your week is worth more to them than any course.
          </p>

          <ul className="relative mt-6 flex flex-col gap-3">
            {[
              { icon: IndianRupee, text: 'Keep 75%. A full ₹99 room is about ₹742 an hour' },
              { icon: CalendarCheck, text: 'Set your own hours and price' },
              { icon: MessagesSquare, text: 'Run group rooms or 1:1 — your call' },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-2.5 text-sm">
                <f.icon className="size-4 shrink-0 text-[var(--cyan-on-dark)]" aria-hidden />
                <span className="text-white/90">{f.text}</span>
              </li>
            ))}
          </ul>

          <span className="relative mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-white px-6 text-sm font-bold text-[var(--navy-800)] transition-colors group-hover:bg-[var(--cyan-300)]">
            Apply to mentor
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>

          <p className="relative mt-3 flex items-center gap-1.5 text-xs text-white/85">
            <BadgeCheck className="size-3.5" aria-hidden />
            Reviewed by a person within 48 hours.
          </p>
        </Link>
      </div>

      <div className="container-page flex flex-col items-center gap-3 pb-10 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/signin" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
        <Logo showWordmark={false} size={28} className="opacity-40" />
      </div>
    </div>
  )
}
