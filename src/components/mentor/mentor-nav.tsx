'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarClock, CalendarPlus, IndianRupee, LayoutDashboard, UserCog } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/mentor', label: 'Today', icon: LayoutDashboard, exact: true },
  { href: '/mentor/sessions', label: 'Sessions', icon: CalendarPlus },
  { href: '/mentor/availability', label: 'Availability', icon: CalendarClock },
  { href: '/mentor/earnings', label: 'Earnings', icon: IndianRupee },
  { href: '/mentor/profile', label: 'Public profile', icon: UserCog },
]

export function MentorNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Mentor" className="lg:sticky lg:top-20 lg:self-start">
      <p className="eyebrow mb-2 hidden lg:block">Mentor</p>
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {LINKS.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href)
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                )}
              >
                <l.icon className="size-4 shrink-0" aria-hidden />
                {l.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
