import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * The mark sits on an opaque rounded white tile rather than floating
 * transparent. The artwork runs the whole lightness range — near-white cyan
 * (#04FFFF) through to near-black navy (#000345) — so on a dark surface the
 * cap vanishes and on a tinted one the cyan washes out. Measured against a
 * navy backing, 61% of the ink falls below 3:1; against white, 21%. White is
 * the only backdrop that holds the whole mark, so it is baked in.
 *
 * A hairline ring keeps the tile from disappearing into a white navbar.
 * public/brand/mark-transparent.png is the version without the tile, for
 * print and dark-background artwork.
 */
export function Logo({
  className,
  showWordmark = true,
  size = 36,
}: {
  className?: string
  showWordmark?: boolean
  size?: number
}) {
  return (
    <Link
      href="/"
      className={cn('flex items-center gap-2.5', className)}
      aria-label="YoursMentor.in — home"
    >
      <Image
        src="/brand/mark.png"
        alt=""
        width={size}
        height={size}
        priority
        className="shrink-0 rounded-[22%] ring-1 ring-border"
        style={{ width: size, height: size }}
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
