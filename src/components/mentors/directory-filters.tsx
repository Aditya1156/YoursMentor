'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TIER_LABEL, TRACK_LABEL, type Track } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface FilterOptions {
  languages: string[]
  states: string[]
  topics: string[]
  minPrice: number
  maxPrice: number
}

const TRACKS: Array<{ value: Track | ''; label: string }> = [
  { value: '', label: 'All Tracks' },
  { value: 'first_job', label: TRACK_LABEL.first_job },
  { value: 'abroad', label: TRACK_LABEL.abroad },
]

/**
 * Filters live in the URL, so the back button restores them and a filtered
 * directory is a shareable link (spec §8 P2 acceptance criteria).
 */
export function DirectoryFilters({ options }: { options: FilterOptions }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const set = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString())
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page') // a new filter always starts at page 1
      startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }))
    },
    [params, pathname, router]
  )

  const get = (k: string) => params.get(k) ?? ''
  const activeCount = ['track', 'language', 'state', 'tier', 'firstGen', 'topic', 'maxPrice']
    .filter((k) => params.get(k)).length

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const v = new FormData(e.currentTarget).get('q')
          set('q', (v as string)?.trim() || null)
        }}
        className="relative"
      >
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
          aria-hidden
        />
        <Input
          name="q"
          defaultValue={get('q')}
          placeholder="Search by role, company, college or topic…"
          aria-label="Search mentors"
          className="h-12 pl-10"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Chips
          value={get('track')}
          onChange={(v) => set('track', v || null)}
          options={TRACKS}
        />

        <Select
          label="Language"
          value={get('language')}
          onChange={(v) => set('language', v)}
          options={options.languages}
        />
        <Select
          label="Home state"
          value={get('state')}
          onChange={(v) => set('state', v)}
          options={options.states}
        />
        <Select
          label="College tier"
          value={get('tier')}
          onChange={(v) => set('tier', v)}
          options={['tier1', 'tier2', 'tier3', 'other']}
          render={(v) => TIER_LABEL[v as keyof typeof TIER_LABEL]}
        />
        <Select
          label="Budget"
          value={get('maxPrice')}
          onChange={(v) => set('maxPrice', v)}
          options={['149', '249', '399', '499'].filter((p) => Number(p) >= options.minPrice)}
          render={(v) => `Up to ₹${v}`}
        />

        <button
          type="button"
          onClick={() => set('firstGen', get('firstGen') ? null : 'true')}
          aria-pressed={!!get('firstGen')}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-pill)] border px-3.5 text-[0.8125rem] font-semibold transition-colors',
            get('firstGen')
              ? 'border-accent bg-accent-soft text-accent-soft-foreground'
              : 'border-border bg-surface text-muted-foreground hover:bg-surface-muted'
          )}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          First-gen only
        </button>

        <Select
          label="Sort"
          value={get('sort')}
          onChange={(v) => set('sort', v)}
          options={['recommended', 'rating', 'price_low', 'price_high']}
          render={(v) =>
            ({ recommended: 'Recommended', rating: 'Highest rated',
               price_low: 'Price: low to high', price_high: 'Price: high to low' }[v] ?? v)
          }
        />

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
          >
            <X aria-hidden /> Clear all
            <Badge tone="indigo">{activeCount}</Badge>
          </Button>
        )}

        {pending && (
          <Loader2 className="size-4 animate-spin text-subtle-foreground" aria-label="Loading" />
        )}
      </div>
    </div>
  )
}

function Chips({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="flex rounded-[var(--radius-pill)] bg-surface-muted p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value || 'all'}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors',
            value === o.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Select({
  label, value, onChange, options, render,
}: {
  label: string
  value: string
  onChange: (v: string | null) => void
  options: string[]
  render?: (v: string) => string
}) {
  if (!options.length) return null
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          'h-9 cursor-pointer appearance-none rounded-[var(--radius-pill)] border bg-surface pl-3.5 pr-8 text-[0.8125rem] font-semibold transition-colors',
          value
            ? 'border-primary bg-primary-soft text-primary-soft-foreground'
            : 'border-border text-muted-foreground hover:bg-surface-muted'
        )}
      >
        <option value="">{label} (all)</option>
        {options.map((o) => (
          <option key={o} value={o}>{render ? render(o) : o}</option>
        ))}
      </select>
      <svg
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 fill-current opacity-60"
        aria-hidden
      >
        <path d="M6 8L2 4h8z" />
      </svg>
    </label>
  )
}
