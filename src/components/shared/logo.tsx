import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * The mark carries its own rounded white tile rather than floating
 * transparent. The artwork runs the whole lightness range — near-white cyan
 * #04FFFF through to near-black navy #000345 — so there is no backdrop-free
 * treatment that holds it: against navy 61% of the ink falls under 3:1
 * contrast, against white 21%. White is baked into the SVG itself.
 *
 * public/brand/ also holds the raster lockups (wordmark, horizontal,
 * stacked) for emails and social cards, where SVG is not an option.
 */
export function Logo({
  className,
  showWordmark = true,
  size = 36,
  tone = 'dark',
  stacked = false,
}: {
  className?: string
  showWordmark?: boolean
  size?: number
  /** `light` for the wordmark on a dark panel, where the usual navy vanishes. */
  tone?: 'dark' | 'light'
  /** Mark above the wordmark, both centred. For the auth panels. */
  stacked?: boolean
}) {
  return (
    <Link
      href="/"
      className={cn(
        'flex',
        stacked ? 'flex-col items-center gap-3' : 'items-center gap-2.5',
        className
      )}
      aria-label="YoursMentor.in — home"
    >
      <Image
        src="/brand/mark.svg"
        alt=""
        width={size}
        height={size}
        priority
        className="shrink-0 rounded-[22%] ring-1 ring-border"
        style={{ width: size, height: size }}
      />
      {showWordmark && (
        <span
          className={cn(
            'font-extrabold leading-none tracking-tight',
            stacked ? 'text-2xl' : 'text-lg'
          )}
        >
          <span className={tone === 'light' ? 'text-white' : 'text-foreground'}>yours</span>
          <span
            className={tone === 'light' ? 'text-[var(--cyan-on-dark)]' : 'text-primary'}
          >
            mentor.in
          </span>
        </span>
      )}
    </Link>
  )
}

/** The tagline, for the footer and marketing surfaces. */
export const TAGLINE = 'Know What to Do Next.'
