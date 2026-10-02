import type { ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RetryButton } from '@/components/shared/retry-button'
import { cn } from '@/lib/utils'

/**
 * Spec §4: every list needs a skeleton, an empty state and an error state.
 *
 * These are server components on purpose, so a page can render them without a
 * client bundle. That means `icon` is an already-rendered element, not a
 * component reference — a component cannot cross the server/client boundary,
 * and passing one is a runtime error rather than a type error.
 */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-[var(--radius-sm)]', className)} />
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: {
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-muted [&_svg]:size-5 [&_svg]:text-subtle-foreground">
        {icon ?? <SearchX aria-hidden />}
      </span>
      <h3 className="text-base">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Button variant="outline" size="sm" asChild className="mt-1">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this right now. Check your connection and try again.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-danger-soft px-6 py-10 text-center"
    >
      <AlertTriangle className="size-5 text-danger" aria-hidden />
      <h3 className="text-base">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      <RetryButton />
    </div>
  )
}
