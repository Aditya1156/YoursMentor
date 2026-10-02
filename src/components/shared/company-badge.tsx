'use client'

import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { companyMonogram, companyTone } from '@/lib/company'
import { cn } from '@/lib/utils'

/**
 * Where a mentor works.
 *
 * A real logo when the mentor gave a company domain, served from our own
 * cache so the student's browser never calls anyone else. The monogram is the
 * fallback, not an afterthought: plenty of mentors work somewhere without a
 * recognisable mark, and a card should not look broken because of it.
 */
export function CompanyBadge({
  company,
  domain,
  size = 'md',
  onDark = false,
  className,
}: {
  company?: string
  domain?: string
  size?: 'sm' | 'md'
  onDark?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const tone = companyTone(company)
  const sm = size === 'sm'
  const showLogo = !!domain && !failed

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] font-bold',
        sm ? 'py-0.5 pl-0.5 pr-2 text-[0.6875rem]' : 'py-1 pl-1 pr-2.5 text-xs',
        className
      )}
      style={
        onDark
          ? { background: 'rgb(255 255 255 / 0.9)', color: tone.fg }
          : { background: tone.bg, color: tone.fg }
      }
    >
      <span
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-full bg-white font-extrabold',
          sm ? 'size-4 text-[0.5625rem]' : 'size-5 text-[0.625rem]'
        )}
      >
        {showLogo ? (
          // Our own route: one server-side fetch per company, then our CDN.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/company-logo/${encodeURIComponent(domain)}`}
            alt=""
            width={sm ? 16 : 20}
            height={sm ? 16 : 20}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="size-full object-contain"
          />
        ) : company ? (
          companyMonogram(company)
        ) : (
          <Building2 className="size-3" aria-hidden />
        )}
      </span>
      {company ?? 'Independent'}
    </span>
  )
}
