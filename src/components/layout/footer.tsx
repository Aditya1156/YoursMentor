import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import { Logo, TAGLINE } from '@/components/shared/logo'

const LINKS = [
  { to: '/mentors?track=first_job', label: 'Track 1 (First Job / Internship)' },
  { to: '/mentors?track=abroad', label: 'Track 2 (Going Abroad)' },
  { to: '/become-a-mentor', label: 'Become a Mentor' },
  { to: '/about', label: 'About' },
  { to: '/refund-policy', label: 'Refund Policy' },
  { to: '/code-of-conduct', label: 'Code of Conduct' },
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/contact', label: 'Grievance / Contact' },
]

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="container-page flex flex-col gap-5 py-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Logo />
            <p className="text-xs font-medium tracking-wide text-subtle-foreground">
              {TAGLINE}
            </p>
          </div>
          <p className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BadgeCheck className="size-4 text-success" aria-hidden />
            Started by Aditya from{' '}
            <a
              href="https://youtube.com/@refactorslife"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              @refactorslife
            </a>
          </p>
        </div>

        <nav aria-label="Footer" className="border-t border-border-subtle pt-4">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link href={l.to}
                  className="text-xs font-medium text-muted-foreground hover:text-primary"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
