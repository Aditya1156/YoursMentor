'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'
import { TRACK_LONG, type Track } from '@/lib/types'
import { cn, formatINR } from '@/lib/utils'

const DURATIONS = [45, 60, 75, 90]
const COMMISSION = 25

export function SessionForm({
  tracks, topics, existing,
}: {
  tracks: Track[]
  topics: string[]
  existing?: {
    id: string; title: string; description: string; track?: Track; topic?: string
    startAt: string; durationMinutes: number; capacity: number; minSeats: number
    price: number; seatsBooked: number
  }
}) {
  const router = useRouter()
  const locked = (existing?.seatsBooked ?? 0) > 0
  const [f, setF] = useState({
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    track: existing?.track ?? tracks[0] ?? '',
    topic: existing?.topic ?? '',
    date: existing ? existing.startAt.slice(0, 10) : '',
    time: existing ? new Date(existing.startAt).toTimeString().slice(0, 5) : '18:00',
    duration: existing?.durationMinutes ?? 60,
    capacity: existing?.capacity ?? 15,
    minSeats: existing?.minSeats ?? 3,
    price: existing?.price ?? 99,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }))

  const valid =
    f.title.trim().length >= 4 &&
    f.date && f.time &&
    f.minSeats <= f.capacity &&
    f.price >= 0 && f.price <= 4999

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      setError('Your session expired. Please sign in again.')
      return
    }

    // The datetime-local pair is wall-clock in the mentor's own zone; the
    // Date constructor resolves it, and Postgres stores UTC.
    const start = new Date(`${f.date}T${f.time}`)
    const end = new Date(start.getTime() + f.duration * 60_000)

    if (start.getTime() < Date.now() + 2 * 3_600_000) {
      setBusy(false)
      setError('Schedule a room at least 2 hours out so students have time to find it.')
      return
    }

    const row = {
      mentor_id: user.id,
      type: 'group' as const,
      title: f.title.trim(),
      description: f.description.trim() || null,
      track: f.track || null,
      topic: f.topic.trim() || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      capacity: f.capacity,
      min_seats: f.minSeats,
      price: f.price,
    }

    const { data, error: saveError } = existing
      ? await supabase.from('sessions').update(row).eq('id', existing.id).select('id').single()
      : await supabase.from('sessions').insert(row).select('id').single()

    setBusy(false)
    if (saveError) {
      // The gist exclusion constraint is the one a mentor will actually hit.
      setError(
        saveError.message.includes('mentor_has_no_overlap')
          ? 'You already have a session running at that time.'
          : saveError.message
      )
      return
    }
    router.push(`/mentor/sessions/${data.id}`)
    router.refresh()
  }

  const earns = Math.round(f.price * f.capacity * (1 - COMMISSION / 100))

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {locked && (
        <Card className="border-accent bg-accent-soft p-3.5">
          <p className="text-xs leading-relaxed text-accent-soft-foreground">
            Students have already booked this room, so the time and price are locked.
            Change either and you would be moving something they paid for. Cancel the
            session instead if you have to — everyone is refunded in credits.
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-4 p-5">
        <Field label="Title" htmlFor="title" required
               hint="Say the outcome, not the topic. &ldquo;Turn 0 shortlists into 5&rdquo; beats &ldquo;Resume tips&rdquo;.">
          <Input id="title" value={f.title} maxLength={140}
                 onChange={(e) => set('title', e.target.value)} />
        </Field>

        <Field label="What students walk away with" htmlFor="desc">
          <textarea id="desc" rows={4} maxLength={2000} value={f.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Live line-by-line roast of four anonymous Tier-3 resumes. You will learn what recruiters actually reject and the impact metrics that get past ATS filters."
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface p-3 text-sm leading-relaxed" />
        </Field>

        {tracks.length > 0 && (
          <Field label="Track" htmlFor="track">
            <div className="flex flex-wrap gap-2" id="track">
              {tracks.map((t) => (
                <button key={t} type="button" onClick={() => set('track', t)}
                  aria-pressed={f.track === t}
                  className={cn(
                    'rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                    f.track === t ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border text-muted-foreground hover:bg-surface-muted'
                  )}>
                  {TRACK_LONG[t]}
                </button>
              ))}
            </div>
          </Field>
        )}

        {topics.length > 0 && (
          <Field label="Topic" htmlFor="topic">
            <select id="topic" value={f.topic} onChange={(e) => set('topic', e.target.value)}
              className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm">
              <option value="">None</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="date" required>
            <Input id="date" type="date" value={f.date} disabled={locked}
                   min={new Date().toISOString().slice(0, 10)}
                   onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Start time" htmlFor="time" required
                 hint="Your local time. Students see it in theirs.">
            <Input id="time" type="time" value={f.time} disabled={locked}
                   onChange={(e) => set('time', e.target.value)} />
          </Field>
        </div>

        <Field label="Duration" htmlFor="duration">
          <div className="flex flex-wrap gap-2" id="duration">
            {DURATIONS.map((d) => (
              <button key={d} type="button" onClick={() => set('duration', d)}
                disabled={locked} aria-pressed={f.duration === d}
                className={cn(
                  'rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50',
                  f.duration === d ? 'border-primary bg-primary text-primary-foreground'
                                   : 'border-border text-muted-foreground hover:bg-surface-muted'
                )}>
                {d} min
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Seats" htmlFor="cap" hint="5 to 15">
            <Input id="cap" type="number" min={2} max={15} value={f.capacity}
                   onChange={(e) => set('capacity', Number(e.target.value))} />
          </Field>
          <Field label="Minimum to run" htmlFor="min"
                 hint="Below this it auto-cancels 6h out.">
            <Input id="min" type="number" min={1} max={f.capacity} value={f.minSeats}
                   onChange={(e) => set('minSeats', Number(e.target.value))} />
          </Field>
          <Field label="Price per seat" htmlFor="price" hint="₹99 is the default.">
            <Input id="price" type="number" min={0} max={4999} value={f.price}
                   disabled={locked} onChange={(e) => set('price', Number(e.target.value))} />
          </Field>
        </div>

        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-surface-muted p-3.5">
          <Users className="size-4 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            A full room earns you{' '}
            <strong className="text-foreground">{formatINR(earns)}</strong>{' '}
            ({f.capacity} × {formatINR(f.price)}, less the {COMMISSION}% platform share).
            You are paid on who attends, and a no-show still counts.
          </p>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Badge tone="neutral">Students see this immediately</Badge>
        <Button type="submit" size="lg" disabled={!valid || busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {existing ? 'Save changes' : 'Publish the room'}
        </Button>
      </div>
    </form>
  )
}
