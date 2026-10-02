'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarOff, Loader2, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Rule {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  timezone: string
}
interface Blocked { date: string; reason?: string }

export function AvailabilityEditor({
  initialRules, initialBlocked,
}: { initialRules: Rule[]; initialBlocked: Blocked[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState({ day: 6, start: '10:00', end: '13:00' })
  const [blockDate, setBlockDate] = useState('')

  // Availability is stored with the zone it was written in, so a mentor abroad
  // keeps their own hours rather than having them silently reinterpreted.
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  async function addRule() {
    setError(null)
    if (draft.end <= draft.start) {
      setError('The end time has to be after the start time.')
      return
    }
    setBusy('add')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: e } = await supabase.from('availability_rules').insert({
      mentor_id: user!.id, day_of_week: draft.day,
      start_time: draft.start, end_time: draft.end, timezone: tz,
    })
    setBusy(null)
    if (e) { setError(e.message); return }
    router.refresh()
  }

  async function removeRule(id: string) {
    setBusy(id)
    await createClient().from('availability_rules').delete().eq('id', id)
    setBusy(null)
    router.refresh()
  }

  async function block() {
    if (!blockDate) return
    setBusy('block')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: e } = await supabase.from('blocked_dates')
      .upsert({ mentor_id: user!.id, date: blockDate }, { onConflict: 'mentor_id,date' })
    setBusy(null)
    if (e) { setError(e.message); return }
    setBlockDate('')
    router.refresh()
  }

  async function unblock(date: string) {
    setBusy(date)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('blocked_dates').delete().eq('mentor_id', user!.id).eq('date', date)
    setBusy(null)
    router.refresh()
  }

  const byDay = DAYS.map((_, i) => initialRules.filter((r) => r.dayOfWeek === i))
  const weeklyHours = initialRules.reduce((t, r) => {
    const [sh, sm] = r.startTime.split(':').map(Number)
    const [eh, em] = r.endTime.split(':').map(Number)
    return t + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)

  return (
    <div className="flex flex-col gap-5">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base">Weekly hours</h2>
          <Badge tone={weeklyHours > 0 ? 'green' : 'neutral'}>
            {weeklyHours > 0 ? `${weeklyHours} hours a week · ${tz}` : 'Nothing set yet'}
          </Badge>
        </div>

        <ul className="mt-4 flex flex-col gap-2">
          {DAYS.map((day, i) => (
            <li key={day} className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-2 last:border-0">
              <span className="w-24 shrink-0 text-sm font-semibold">{day}</span>
              {byDay[i]!.length === 0 ? (
                <span className="text-xs text-subtle-foreground">Not available</span>
              ) : (
                byDay[i]!.map((r) => (
                  <span key={r.id}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-soft-foreground">
                    {r.startTime} – {r.endTime}
                    <button type="button" onClick={() => removeRule(r.id)}
                            disabled={busy === r.id} aria-label={`Remove ${day} ${r.startTime}`}
                            className="hover:text-danger">
                      {busy === r.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                    </button>
                  </span>
                ))
              )}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-end gap-2 rounded-[var(--radius-md)] bg-surface-muted p-3.5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold">Day</span>
            <select value={draft.day} onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}
              className="h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-sm">
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold">From</span>
            <Input type="time" value={draft.start} className="h-10 w-32"
                   onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold">To</span>
            <Input type="time" value={draft.end} className="h-10 w-32"
                   onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
          </label>
          <Button size="sm" onClick={addRule} disabled={busy === 'add'}>
            {busy === 'add' ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Add
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-base">
          <CalendarOff className="size-4 text-subtle-foreground" aria-hidden />
          Days you are away
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Exams, travel, anything. No slots are generated on these days.
        </p>

        {initialBlocked.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {initialBlocked.map((b) => (
              <span key={b.date}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                <button type="button" onClick={() => unblock(b.date)} disabled={busy === b.date}
                        aria-label={`Unblock ${b.date}`}>
                  {busy === b.date ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Input type="date" value={blockDate} className="h-10 w-44"
                 min={new Date().toISOString().slice(0, 10)}
                 onChange={(e) => setBlockDate(e.target.value)} />
          <Button variant="outline" size="sm" onClick={block} disabled={!blockDate || busy === 'block'}>
            {busy === 'block' && <Loader2 className="animate-spin" aria-hidden />}
            Block this day
          </Button>
        </div>
      </Card>
    </div>
  )
}
