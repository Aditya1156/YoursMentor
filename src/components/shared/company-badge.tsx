import { Building2 } from 'lucide-react'
import { companyMonogram, companyTone } from '@/lib/company'
import { cn } from '@/lib/utils'

/**
 * Where a mentor works, as a mark rather than a line of text.
 *
 * The monogram and its colour come from the company name, so it is stable
 * everywhere and needs no image request. See lib/company.ts for why this is
 * not a real logo.
 */
export function CompanyBadge({
  company,
  size = 'md',
  className,
}: {
  company?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const tone = companyTone(company)
  const sm = size === 'sm'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] font-bold',
        sm ? 'py-0.5 pl-0.5 pr-2 text-[0.6875rem]' : 'py-1 pl-1 pr-2.5 text-xs',
        className
      )}
      style={{ background: tone.bg, color: tone.fg }}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-white/70 font-extrabold',
          sm ? 'size-4 text-[0.5625rem]' : 'size-5 text-[0.625rem]'
        )}
      >
        {company ? companyMonogram(company) : <Building2 className="size-3" aria-hidden />}
      </span>
      {company ?? 'Independent'}
    </span>
  )
}
