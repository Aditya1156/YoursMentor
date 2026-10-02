import Link from 'next/link'
import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Logo } from '@/components/shared/logo'

/**
 * Shared frame for every auth screen.
 *
 * On a wide screen it pairs the form with a brand panel, because an auth page
 * is the one place a visitor has stopped to read and the only thing on offer
 * is a form. The panel says what is on the other side of it. Below `lg` the
 * panel is dropped rather than stacked — on a phone it would push the form
 * below the fold, and nobody reads marketing copy on the way to logging in.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  aside,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="container-page py-8 md:py-14">
      <div
        className={
          aside
            ? 'mx-auto grid max-w-4xl gap-8 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center'
            : 'mx-auto max-w-md'
        }
      >
        {aside && <div className="hidden lg:block">{aside}</div>}

        <div className="mx-auto w-full max-w-md">
          <Card className="p-6 shadow-[var(--shadow-raised)] sm:p-8">
            <h1 className="text-2xl">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
            <div className="mt-6">{children}</div>
          </Card>

          {footer && (
            <p className="mt-4 text-center text-sm text-muted-foreground">{footer}</p>
          )}

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-subtle-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            YoursMentor is 18+ only right now.{' '}
            <Link href="/privacy" className="font-semibold text-primary hover:underline">
              Privacy
            </Link>
          </p>
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
      className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--navy-800)] p-7 text-white"
      style={{ background: 'var(--brand-gradient-deep)' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-white/10"
      />

      <div className="relative">
        <Logo showWordmark={false} size={36} />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--cyan-on-dark)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl leading-tight text-white">{title}</h2>

        <ul className="mt-6 flex flex-col gap-3.5">
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
          <figure className="mt-7 rounded-[var(--radius-md)] bg-black/25 p-4">
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
