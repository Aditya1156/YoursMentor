import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Bell, LogOut, Menu, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Logo } from '@/components/shared/logo'
import { useSession } from '@/features/auth/use-session'
import { useAuth } from '@/features/auth/auth-context'
import { cn, formatINR } from '@/lib/utils'

const NAV = [
  { to: '/mentors', label: 'Find Mentors' },
  { to: '/sessions', label: 'Group Sessions (₹99)' },
  { to: '/dashboard', label: 'Student Dashboard', authOnly: true },
  { to: '/become-a-mentor', label: 'Become a Mentor' },
] as const

export function Navbar() {
  const { user } = useSession()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const links = NAV.filter((l) => !('authOnly' in l && l.authOnly) || user)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-[var(--radius-pill)] px-3.5 py-2 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-primary-soft text-primary-soft-foreground'
                      : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden items-center gap-1.5 rounded-[var(--radius-pill)] border border-border px-3 py-1.5 text-xs font-semibold sm:inline-flex">
                <Wallet className="size-3.5 text-primary" aria-hidden />
                My Credits: {formatINR(user.creditsBalance)}
              </span>
              <Link
                to="/notifications"
                className="relative hidden rounded-full p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground sm:block"
                aria-label={`Notifications${user.unreadNotifications ? `, ${user.unreadNotifications} unread` : ''}`}
              >
                <Bell className="size-5" aria-hidden />
                {user.unreadNotifications > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" />
                )}
              </Link>
              <Link
                to="/settings"
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
                onClick={() => void logout()}
                className="hidden rounded-full p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground sm:block"
                aria-label="Log out"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Get started</Link>
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
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-[var(--radius-sm)] px-3 py-3 text-sm font-semibold',
                      isActive
                        ? 'bg-primary-soft text-primary-soft-foreground'
                        : 'text-muted-foreground'
                    )
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            {!user && (
              <li>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-[var(--radius-sm)] px-3 py-3 text-sm font-semibold text-muted-foreground"
                >
                  Log in
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  )
}
