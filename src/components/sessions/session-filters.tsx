'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TRACK_LABEL } from '@/lib/types'
import { cn } from '@/lib/utils'

const TRACKS = [
  { value: '', label: 'All tracks' },
  { value: 'first_job', label: TRACK_LABEL.first_job },
  { value: 'abroad', label: TRACK_LABEL.abroad },
]
const WHEN = [
  { value: '', label: 'Any time' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
]

export function SessionFiltersBar({ topics }: { topics: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }))
  }
  const get = (k: string) => params.get(k) ?? ''
  const active = ['track', 'when', 'topic'].filter((k) => params.get(k)).length

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Group value={get('track')} onChange={(v) => set('track', v)} options={TRACKS} />
      <Group value={get('when')} onChange={(v) => set('when', v)} options={WHEN} />

      {topics.length > 0 && (
        <label className="relative">
          <span className="sr-only">Topic</span>
          <select
            value={get('topic')}
            onChange={(e) => set('topic', e.target.value)}
            className={cn(
              'h-9 cursor-pointer appearance-none rounded-[var(--radius-pill)] border bg-surface pl-3.5 pr-8 text-[0.8125rem] font-semibold',
              get('topic')
                ? 'border-primary bg-primary-soft text-primary-soft-foreground'
                : 'border-border text-muted-foreground hover:bg-surface-muted'
            )}
          >
            <option value="">Topic (all)</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      )}

      {active > 0 && (
        <Button variant="ghost" size="sm"
                onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}>
          <X aria-hidden /> Clear
        </Button>
      )}
      {pending && <Loader2 className="size-4 animate-spin text-subtle-foreground" />}
    </div>
  )
}

function Group({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="flex rounded-[var(--radius-pill)] bg-surface-muted p-1">
      {options.map((o) => (
        <button
          key={o.value || 'all'}
          type="button"
          aria-pressed={value === o.value}
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
