'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Keeps every active filter in the link, so paging never resets the search. */
export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const pathname = usePathname()
  const params = useSearchParams()
  if (pageCount <= 1) return null

  const href = (p: number) => {
    const next = new URLSearchParams(params.toString())
    if (p <= 1) next.delete('page')
    else next.set('page', String(p))
    const qs = next.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  // 1 … 4 5 6 … 12
  const pages = [...new Set([
    1,
    ...Array.from({ length: 3 }, (_, i) => page - 1 + i).filter((p) => p > 1 && p < pageCount),
    pageCount,
  ])].sort((a, b) => a - b)

  const box =
    'inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-sm font-semibold transition-colors'

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 pt-2">
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label="Previous page"
              className={cn(box, 'border border-border hover:bg-surface-muted')}>
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(box, 'border border-border-subtle opacity-40')}>
          <ChevronLeft className="size-4" aria-hidden />
        </span>
      )}

      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1] !== p - 1 && (
            <span className="px-1 text-subtle-foreground" aria-hidden>…</span>
          )}
          <Link
            href={href(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(box, p === page
              ? 'bg-primary text-primary-foreground'
              : 'border border-border hover:bg-surface-muted')}
          >
            {p}
          </Link>
        </span>
      ))}

      {page < pageCount ? (
        <Link href={href(page + 1)} aria-label="Next page"
              className={cn(box, 'border border-border hover:bg-surface-muted')}>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(box, 'border border-border-subtle opacity-40')}>
          <ChevronRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  )
}
