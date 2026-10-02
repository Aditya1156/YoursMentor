import { AlertTriangle, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Section 4: every list needs a skeleton, an empty state and an error state. */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-[var(--radius-sm)]', className)} />
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = SearchX,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ElementType
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-muted">
        <Icon className="size-5 text-subtle-foreground" aria-hidden />
      </span>
      <h3 className="text-base">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this right now. Check your connection and try again.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-danger-soft px-6 py-10 text-center"
    >
      <AlertTriangle className="size-5 text-danger" aria-hidden />
      <h3 className="text-base">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
