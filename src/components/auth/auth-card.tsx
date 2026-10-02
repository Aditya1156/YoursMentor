import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'

/** Shared frame for A1–A4 so every auth screen reads as one flow. */
export function AuthCard({
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
          <Link href="/privacy" className="font-semibold text-primary hover:underline">
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
