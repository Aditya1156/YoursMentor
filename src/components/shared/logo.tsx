import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * The supplied mark (public/brand/mark.png) plus a live-text wordmark.
 * The wordmark is text rather than the raster so it stays crisp at every size
 * and reflows on a 360px screen. It follows the artwork's two-tone split:
 * "yours" in navy, "mentor.in" in brand blue.
 *
 * public/brand/ also holds logo-horizontal.png, logo-stacked.png and
 * wordmark.png for places that need the full artwork (emails, social cards).
 */
export function Logo({
  className,
  showWordmark = true,
  size = 32,
}: {
  className?: string
  showWordmark?: boolean
  size?: number
}) {
  return (
    <Link
      href="/"
      className={cn('flex items-center gap-2', className)}
      aria-label="YoursMentor.in — home"
    >
      <Image
        src="/brand/mark.png"
        alt=""
        width={size}
        height={size}
        priority
        className="shrink-0"
      />
      {showWordmark && (
        <span className="text-lg font-extrabold leading-none tracking-tight">
          <span className="text-foreground">yours</span>
          <span className="text-primary">mentor.in</span>
        </span>
      )}
    </Link>
  )
}

/** The tagline, for the footer and marketing surfaces. */
export const TAGLINE = 'Know What to Do Next.'
