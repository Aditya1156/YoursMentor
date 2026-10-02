'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, UserPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'
import { TRACK_LONG, type Track } from '@/lib/types'
import { cn, formatINR } from '@/lib/utils'

interface Host {
  id: string
  name: string
  headline: string
  isSelf: boolean
}

const DURATIONS = [45, 60, 75, 90]
const TRACKS: Track[] = ['first_job', 'abroad']

/**
 * The admin version of the session form. Same rules as a mentor's, with one
 * addition: a host picker, so support can schedule on a mentor's behalf.
 *
 * If the admin has never hosted before they have no mentor profile, and
 * sessions.mentor_id has to point at one. "Set me up as a host" calls
 * ensure_host_profile, which creates an approved profile for them — an admin
 * who teaches is a mentor, so they get a real one rather than a special case.
 */
export function AdminSessionForm({ hosts }: { hosts: Host[] }) {
  const router = useRouter()
  const self = hosts.find((h) => h.isSelf)
  const [hostId, setHostId] = useState(self?.id ?? hosts[0]?.id ?? '')
  const [becoming, setBecoming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({
    type: 'group' as 'group' | 'one_on_one',
    title: '', description: '', track: 'first_job' as Track, topic: '',
    date: '', time: '18:00', duration: 60, capacity: 15, minSeats: 3, price: 99,
  })

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }))

  async function becomeHost() {
    setBecoming(true)
    setError(null)
    const res = await fetch('/api/admin/host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headline: 'Session host at YoursMentor.in' }),
    })
    setBecoming(false)
    if (!res.ok) {
      setError((await res.json()).error ?? 'Could not set you up as a host.')
      return
    }
    router.refresh()
  }

  const valid = hostId && f.title.trim().length >= 4 && f.date && f.time &&
    f.minSeats <= f.capacity

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const start = new Date(`${f.date}T${f.time}`)
    const end = new Date(start.getTime() + f.duration * 60_000)
    if (start.getTime() < Date.now()) {
      setBusy(false)
      setError('That start time is in the past.')
      return
    }

    const { data, error: e2 } = await createClient()
      .from('sessions')
      .insert({
        mentor_id: hostId,
        type: f.type,
        title: f.title.trim(),
        description: f.description.trim() || null,
        track: f.track,
        topic: f.topic.trim() || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        // A 1:1 is capacity 1 by constraint; the form keeps them in step.
        capacity: f.type === 'one_on_one' ? 1 : f.capacity,
        min_seats: f.type === 'one_on_one' ? 1 : f.minSeats,
        price: f.price,
      })
      .select('id')
      .single()

    setBusy(false)
    if (e2) {
      setError(
        e2.message.includes('mentor_has_no_overlap')
          ? 'That host already has a session at that time.'
          : e2.message
      )
      return
    }
    router.push(`/sessions/${data.id}`)
    router.refresh()
  }

  if (hosts.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3 p-5">
        <Badge tone="amber"><UserPlus aria-hidden /> One step first</Badge>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A session needs a host profile, and you do not have one yet. This creates an
          approved one for you — the same kind a mentor has, so availability, attendance
          and earnings all work normally.
        </p>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Button onClick={becomeHost} disabled={becoming}>
          {becoming && <Loader2 className="animate-spin" aria-hidden />}
          Set me up as a host
        </Button>
      </Card>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Card className="flex flex-col gap-4 p-5">
        <Field label="Who is hosting" htmlFor="host" required>
          <select
            id="host" value={hostId} onChange={(e) => setHostId(e.target.value)}
            className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm"
          >
            {hosts.map((h) => (
              <option key={h.id} value={h.id}>
                {h.isSelf ? `${h.name} (you)` : h.name} — {h.headline}
              </option>
            ))}
          </select>
        </Field>
        {!self && (
          <button
            type="button" onClick={becomeHost} disabled={becoming}
            className="self-start text-xs font-semibold text-primary hover:underline"
          >
            {becoming ? 'Setting up…' : 'Set me up as a host too'}
          </button>
        )}

        <Field label="Format" htmlFor="type">
          <div className="flex gap-2" id="type">
            {([
              { v: 'group' as const, label: 'Group room', hint: 'Up to 15 students' },
              { v: 'one_on_one' as const, label: '1:1 call', hint: 'One student' },
            ]).map((o) => (
              <button
                key={o.v} type="button" onClick={() => set('type', o.v)}
                aria-pressed={f.type === o.v}
                className={cn(
                  'flex-1 rounded-[var(--radius-md)] border p-3 text-left transition-colors',
                  f.type === o.v ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-muted'
                )}
              >
                <span className="block text-sm font-bold">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <Field label="Title" htmlFor="title" required
               hint="Say the outcome. &ldquo;Turn 0 shortlists into 5&rdquo; beats &ldquo;Resume tips&rdquo;.">
          <Input id="title" value={f.title} maxLength={140}
                 onChange={(e) => set('title', e.target.value)} />
        </Field>

        <Field label="What students walk away with" htmlFor="desc">
          <textarea id="desc" rows={3} maxLength={2000} value={f.description}
            onChange={(e) => set('description', e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface p-3 text-sm leading-relaxed" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Track" htmlFor="track">
            <select id="track" value={f.track}
              onChange={(e) => set('track', e.target.value as Track)}
              className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm">
              {TRACKS.map((t) => <option key={t} value={t}>{TRACK_LONG[t]}</option>)}
            </select>
          </Field>
          <Field label="Topic" htmlFor="topic" hint="Optional.">
            <Input id="topic" value={f.topic} placeholder="Resume, DSA, Education loans"
                   onChange={(e) => set('topic', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="date" required>
            <Input id="date" type="date" value={f.date}
                   min={new Date().toISOString().slice(0, 10)}
                   onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Start time" htmlFor="time" required hint="Your local time.">
            <Input id="time" type="time" value={f.time}
                   onChange={(e) => set('time', e.target.value)} />
          </Field>
        </div>

        <Field label="Duration" htmlFor="duration">
          <div className="flex flex-wrap gap-2" id="duration">
            {DURATIONS.map((d) => (
              <button key={d} type="button" onClick={() => set('duration', d)}
                aria-pressed={f.duration === d}
                className={cn(
                  'rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-sm font-semibold',
                  f.duration === d ? 'border-primary bg-primary text-primary-foreground'
                                   : 'border-border text-muted-foreground hover:bg-surface-muted'
                )}>
                {d} min
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          {f.type === 'group' && (
            <>
              <Field label="Seats" htmlFor="cap" hint="2 to 15">
                <Input id="cap" type="number" min={2} max={15} value={f.capacity}
                       onChange={(e) => set('capacity', Number(e.target.value))} />
              </Field>
              <Field label="Minimum to run" htmlFor="min">
                <Input id="min" type="number" min={1} max={f.capacity} value={f.minSeats}
                       onChange={(e) => set('minSeats', Number(e.target.value))} />
              </Field>
            </>
          )}
          <Field label="Price per seat" htmlFor="price" hint="0 makes it free.">
            <Input id="price" type="number" min={0} max={4999} value={f.price}
                   onChange={(e) => set('price', Number(e.target.value))} />
          </Field>
        </div>

        <p className="flex items-center gap-2 rounded-[var(--radius-md)] bg-surface-muted p-3 text-xs text-muted-foreground">
          {f.price === 0 ? (
            <><Sparkles className="size-4 shrink-0 text-accent" aria-hidden />
            Free. Students confirm a seat without paying — useful for a launch class.</>
          ) : (
            <><Users className="size-4 shrink-0 text-primary" aria-hidden />
            A full room takes {formatINR(f.price * (f.type === 'group' ? f.capacity : 1))},
            of which the host keeps 75%.</>
          )}
        </p>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={!valid || busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          Publish the session
        </Button>
      </div>
    </form>
  )
}
