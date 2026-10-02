import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { LEGAL, legalDetailsComplete } from '@/lib/legal'

/**
 * The shell every policy page uses, so they read as one document set rather
 * than five pages written on five different days.
 *
 * Deliberately plain: a student skimming this on a phone before paying ₹99
 * should be able to find the refund rule in a few seconds, which argues for
 * short sections with honest headings over a wall of defined terms.
 */
export function LegalPage({
  title, intro, children,
}: {
  title: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <p className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
        YoursMentor.in
      </p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">{intro}</p>
      <p className="mt-3 text-xs text-subtle-foreground">
        Last updated {new Date(LEGAL.updated).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </p>

      {!legalDetailsComplete && (
        <div className="mt-6 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 p-3.5">
          <AlertTriangle className="mt-px size-4 shrink-0 text-amber-700" aria-hidden />
          <p className="text-xs leading-relaxed text-amber-900">
            We are not yet accepting payments. Our registered entity details and the
            name of our grievance officer will be published on this page before we
            do. Until then, reach us at{' '}
            <a href={`mailto:${LEGAL.supportEmail}`} className="font-semibold underline">
              {LEGAL.supportEmail}
            </a>
            .
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-7">{children}</div>

      <hr className="mt-10 border-border" />
      <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Link href="/terms" className="hover:underline">Terms</Link>
        <Link href="/privacy" className="hover:underline">Privacy</Link>
        <Link href="/refund-policy" className="hover:underline">Refunds</Link>
        <Link href="/code-of-conduct" className="hover:underline">Code of conduct</Link>
        <Link href="/contact" className="hover:underline">Contact</Link>
      </nav>
    </div>
  )
}

/** One numbered section. */
export function Section({
  heading, children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-lg font-extrabold tracking-tight">{heading}</h2>
      <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground [&_a]:font-semibold [&_a]:text-primary [&_a:hover]:underline [&_strong]:font-bold [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  )
}

/** A plain bulleted list, styled once. */
export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i} className="list-disc marker:text-border-strong">
          {item}
        </li>
      ))}
    </ul>
  )
}
