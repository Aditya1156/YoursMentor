import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Wordmark + mark. The mark is two chevrons stepping up — "one step ahead".
 * Replace the SVG when the final logo file lands; the layout stays.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('flex items-center gap-2 font-extrabold tracking-tight', className)}
      aria-label="OneStep — home"
    >
      <svg viewBox="0 0 28 28" className="size-7 shrink-0" aria-hidden>
        <rect width="28" height="28" rx="8" fill="var(--primary)" />
        <path
          d="M7 18.5l5-5 3 3 6-6"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="21" cy="10.5" r="2" fill="var(--amber-300)" />
      </svg>
      <span className="text-lg">OneStep</span>
    </Link>
  )
}
