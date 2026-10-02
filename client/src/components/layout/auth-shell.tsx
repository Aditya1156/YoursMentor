import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'

/** Shared frame for A1–A4 so every auth screen looks like one flow. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="container-page flex justify-center py-10 md:py-16">
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
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
          OneStep is 18+ only right now.{' '}
          <Link to="/privacy" className="font-semibold text-primary hover:underline">
            Privacy
          </Link>
        </p>
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

export function GoogleButton({ role, returnTo }: { role?: string; returnTo?: string }) {
  const params = new URLSearchParams()
  if (role) params.set('role', role)
  if (returnTo) params.set('returnTo', returnTo)
  const qs = params.toString()

  return (
    <a
      href={`${import.meta.env.VITE_API_URL ?? ''}/api/auth/google${qs ? `?${qs}` : ''}`}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
      </svg>
      Continue with Google
    </a>
  )
}
