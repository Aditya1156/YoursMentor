import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({
  value,
  count,
  className,
}: {
  value: number
  count?: number
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs font-semibold', className)}
      aria-label={`Rated ${value.toFixed(2)} out of 5${count ? ` from ${count} reviews` : ''}`}
    >
      <Star className="size-3.5 fill-[var(--amber-400)] text-[var(--amber-400)]" aria-hidden />
      <span className="text-foreground">{value.toFixed(2)}</span>
      {count !== undefined && (
        <span className="font-medium text-subtle-foreground">({count})</span>
      )}
    </span>
  )
}
