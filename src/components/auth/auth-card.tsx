import Link from 'next/link'
import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Logo } from '@/components/shared/logo'

/**
 * Shared frame for every auth screen.
 *
 * On a wide screen the page is split in half: the form on one side, a panel
 * saying what is on the other side of it on the other. An auth page is the
 * one place a visitor has stopped to read, and a bare form wastes that.
 *
 * `asideSide` mirrors the two. Sign-in reads content then form; sign-up reads
 * form then content. Swapping them means someone bouncing between the two
 * screens sees the page change shape, so it is obvious they moved rather than
 * that the same page re-rendered.
 *
 * Below `lg` the panel is dropped rather than stacked — on a phone it would
 * push the form below the fold, and nobody reads marketing copy on their way
 * to logging in.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  aside,
  asideSide = 'left',
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  aside?: ReactNode
  asideSide?: 'left' | 'right'
}) {
  return (
    <div className="container-page py-8 md:py-10">
      <div
        className={
          aside
            ? 'mx-auto grid max-w-5xl items-stretch gap-6 lg:grid-cols-2'
            : 'mx-auto max-w-md'
        }
      >
        {aside && (
          <div
            className={`hidden lg:flex ${
              asideSide === 'right'
                ? 'lg:order-2 auth-in-right'
                : 'lg:order-1 auth-in-left'
            }`}
          >
            {aside}
          </div>
        )}

        <div
          className={`mx-auto flex w-full flex-col ${
            aside ? 'max-w-lg lg:max-w-none' : 'max-w-md'
          } ${
            aside
              ? asideSide === 'right'
                ? 'lg:order-1 auth-in-left auth-in-delay'
                : 'lg:order-2 auth-in-right auth-in-delay'
              : 'auth-in-right'
          }`}
        >
          {/* The footer and the 18+ line live inside the card rather than
              under it. Outside, they made this column taller than the panel
              beside it, so the two halves never lined up. */}
          <Card className="flex flex-1 flex-col justify-center p-6 shadow-[var(--shadow-raised)] sm:p-7">
            <h1 className="text-2xl">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}

            <div className="mt-5">{children}</div>

            {footer && (
              <p className="mt-5 border-t border-border-subtle pt-4 text-center text-sm text-muted-foreground">
                {footer}
              </p>
            )}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-subtle-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              YoursMentor is 18+ only right now.{' '}
              <Link href="/privacy" className="font-semibold text-primary hover:underline">
                Privacy
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

/**
 * The panel beside the form. Dark, so the white card reads as the thing to
 * act on rather than competing with it.
 */
export function AuthAside({
  eyebrow,
  title,
  points,
  quote,
}: {
  eyebrow: string
  title: string
  points: { icon: React.ElementType; text: string }[]
  quote?: { text: string; by: string }
}) {
  return (
    <div
      className="relative flex w-full flex-1 flex-col justify-center overflow-hidden rounded-[var(--radius-xl)] border border-[var(--navy-800)] p-7 text-white"
      style={{ background: 'var(--brand-gradient-deep)' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-14 size-56 rounded-full bg-white/10"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-12 size-56 rounded-full bg-black/15"
      />

      <div className="relative">
        {/* The panel's anchor. Big enough to be the brand rather than a
            bookmark, and centred with the lines that introduce the page —
            the list below stays left-aligned, because centred bullets are
            hard to scan. */}
        <div className="flex flex-col items-center text-center">
          <Logo stacked tone="light" size={64} />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--cyan-on-dark)]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl leading-tight text-white">{title}</h2>
        </div>

        <ul className="mt-5 flex flex-col gap-3">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-black/25">
                <Icon className="size-3.5 text-[var(--cyan-300)]" aria-hidden />
              </span>
              <span className="text-white/90">{text}</span>
            </li>
          ))}
        </ul>

        {quote && (
          <figure className="mt-6 rounded-[var(--radius-md)] bg-black/25 p-4">
            <blockquote className="text-[0.8125rem] leading-relaxed text-white/90">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <figcaption className="mt-2 text-xs font-semibold text-[var(--cyan-on-dark)]">
              {quote.by}
            </figcaption>
          </figure>
        )}
      </div>
    </div>
  )
}
