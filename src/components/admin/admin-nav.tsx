'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BadgePercent, CalendarRange, Flag, LayoutDashboard, Receipt, UserCheck, Users, Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/mentors', label: 'Mentors', icon: UserCheck },
  { href: '/admin/sessions', label: 'Sessions', icon: CalendarRange },
  { href: '/admin/users', label: 'Students', icon: Users },
  { href: '/admin/bookings', label: 'Bookings', icon: Receipt },
  { href: '/admin/coupons', label: 'Coupons', icon: BadgePercent },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/payouts', label: 'Payouts', icon: Wallet },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-20 lg:self-start">
      <p className="eyebrow mb-2 hidden lg:block">Admin</p>
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
