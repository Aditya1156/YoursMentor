'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, IndianRupee, LogOut, Menu, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Logo } from '@/components/shared/logo'
import { createClient } from '@/lib/supabase/client'
import type { SessionUser } from '@/lib/session'
import { cn, formatINR } from '@/lib/utils'

interface NavLink {
  href: string
  label: string
}

/**
 * What each role sees. There is no shared list with flags on it, because the
 * flags were the bug: "Become a Mentor" was being offered to mentors, and
 * "Student Dashboard" to admins, while neither had a link to their own area.
 *
 * Recruiting belongs to people who have not joined yet. Once someone is a
 * student, "Become a Mentor" stops being an invitation and starts being a
 * suggestion that they are in the wrong place; it lives on the landing page
 * and in the footer, where a curious student can still find it.
 */
const NAV_BY_ROLE: Record<'guest' | 'student' | 'mentor' | 'admin', readonly NavLink[]> = {
  guest: [
    { href: '/mentors', label: 'Find Mentors' },
    { href: '/sessions', label: 'Group Sessions (₹99)' },
    { href: '/pricing', label: 'Plans' },
    { href: '/become-a-mentor', label: 'Become a Mentor' },
  ],
  student: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/mentors', label: 'Find Mentors' },
    { href: '/sessions', label: 'Group Sessions (₹99)' },
    { href: '/my-sessions', label: 'My Sessions' },
    { href: '/pricing', label: 'Plans' },
  ],
  mentor: [
    { href: '/mentor', label: 'Dashboard' },
    { href: '/mentor/sessions', label: 'My Sessions' },
    { href: '/mentor/availability', label: 'Availability' },
    { href: '/mentor/earnings', label: 'Earnings' },
  ],
  admin: [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/mentors', label: 'Mentors' },
    { href: '/admin/sessions', label: 'Sessions' },
    { href: '/admin/coupons', label: 'Coupons' },
  ],
}

export function NavbarClient({ user }: { user: SessionUser | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const links = NAV_BY_ROLE[user?.role ?? 'guest']

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? 'page' : undefined}
                className={cn(
                  'rounded-[var(--radius-pill)] px-3.5 py-2 text-sm font-semibold transition-colors',
                  isActive(l.href)
                    ? 'bg-primary-soft text-primary-soft-foreground'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Credits are a refund wallet: money that came back after a
                  cancellation, spendable on another booking. That is a student's
                  concern. A mentor is paid out, which is a different number in a
                  different place, so they get a link to it instead. */}
              {user.role === 'student' && (
                <Link
                  href="/dashboard"
                  className="hidden items-center gap-1.5 rounded-[var(--radius-pill)] border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted sm:inline-flex"
                >
                  <Wallet className="size-3.5 text-primary" aria-hidden />
                  Credits: {formatINR(user.creditsBalance)}
                </Link>
              )}
              {user.role === 'mentor' && (
                <Link
                  href="/mentor/earnings"
                  className="hidden items-center gap-1.5 rounded-[var(--radius-pill)] border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted sm:inline-flex"
                >
                  <IndianRupee className="size-3.5 text-primary" aria-hidden />
                  Earnings
                </Link>
              )}
              <Link
                href="/notifications"
                className="relative hidden rounded-full p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground sm:block"
                aria-label={`Notifications${user.unreadNotifications ? `, ${user.unreadNotifications} unread` : ''}`}
              >
                <Bell className="size-5" aria-hidden />
                {user.unreadNotifications > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" />
                )}
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-[var(--radius-pill)] py-1 pl-1 pr-2 hover:bg-surface-muted"
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-xs font-bold">{user.name}</span>
                  <span className="block text-[0.6875rem] text-subtle-foreground">
                    {user.subtitle}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="hidden rounded-full p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground sm:block"
                aria-label="Log out"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/signin">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/join">Get started</Link>
              </Button>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-[var(--radius-sm)] p-2 text-muted-foreground hover:bg-surface-muted lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-border bg-surface lg:hidden"
        >
          <ul className="container-page flex flex-col py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block rounded-[var(--radius-sm)] px-3 py-3 text-sm font-semibold',
                    isActive(l.href)
                      ? 'bg-primary-soft text-primary-soft-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="block w-full rounded-[var(--radius-sm)] px-3 py-3 text-left text-sm font-semibold text-muted-foreground"
                >
                  Log out
                </button>
              ) : (
                <Link
                  href="/signin"
                  onClick={() => setOpen(false)}
                  className="block rounded-[var(--radius-sm)] px-3 py-3 text-sm font-semibold text-muted-foreground"
                >
                  Log in
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
