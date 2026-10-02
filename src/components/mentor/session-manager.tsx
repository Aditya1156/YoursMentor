'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Save, UserX, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'
import type { BookingStatus } from '@/lib/types'

interface Attendee {
  bookingId: string
  studentId: string
  name: string
  college?: string
  avatarUrl?: string
  status: BookingStatus
}

export function SessionManager({
  sessionId, status, started, notes, attendees, seatsBooked, startsInHours,
}: {
  sessionId: string
  status: string
  started: boolean
  notes: string
  attendees: Attendee[]
  seatsBooked: number
  startsInHours: number
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(notes)
  const [busy, setBusy] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  async function mark(bookingId: string, attended: boolean) {
    setBusy(bookingId)
    setError(null)
    const { error: e } = await createClient()
      .rpc('mark_attendance', { p_booking: bookingId, p_attended: attended })
    setBusy(null)
    if (e) { setError(e.message); return }
    router.refresh()
  }

  async function saveNotes() {
    setBusy('notes')
    setError(null)
    const { error: e } = await createClient()
      .from('sessions').update({ description: draft }).eq('id', sessionId)
    setBusy(null)
    if (e) { setError(e.message); return }
    setSaved(true)
    router.refresh()
  }

  async function cancelSession() {
    setBusy('cancel')
    setError(null)
    const { error: e } = await createClient()
      .rpc('cancel_session', { p_session: sessionId, p_reason: null })
    setBusy(null)
    if (e) { setError(e.message); return }
    router.push('/mentor/sessions')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Card className="p-5">
        <h2 className="text-base">
          Who booked{seatsBooked > 0 ? ` (${seatsBooked})` : ''}
        </h2>
        {attendees.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nobody yet. Rooms fill fastest when you share the link in the same place
            students already follow you.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {attendees.map((a) => (
              <li key={a.bookingId}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2 last:border-0 last:pb-0">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={a.name} src={a.avatarUrl} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{a.name}</span>
                    {a.college && (
                      <span className="block truncate text-xs text-muted-foreground">{a.college}</span>
                    )}
                  </span>
                </span>

                {started ? (
                  a.status === 'attended' ? (
                    <Badge tone="green"><Check aria-hidden /> Attended</Badge>
                  ) : a.status === 'no_show_student' ? (
                    <span className="flex items-center gap-1.5">
                      <Badge tone="neutral"><UserX aria-hidden /> No-show</Badge>
                      <Button variant="ghost" size="sm" disabled={busy === a.bookingId}
                              onClick={() => mark(a.bookingId, true)}>Undo</Button>
                    </span>
                  ) : (
                    <span className="flex gap-1.5">
                      <Button variant="outline" size="sm" disabled={busy === a.bookingId}
                              onClick={() => mark(a.bookingId, true)}>
                        {busy === a.bookingId ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                        Attended
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busy === a.bookingId}
                              onClick={() => mark(a.bookingId, false)}>
                        <X aria-hidden /> No-show
                      </Button>
                    </span>
                  )
                ) : (
                  <Badge tone="indigo">Confirmed</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
        {started && attendees.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            A no-show still counts as used, so you are still paid for it. That is the rule
            students see on the booking page too.
          </p>
        )}
      </Card>

      {started && (
        <Card className="p-5">
          <h2 className="text-base">Summary and next steps</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Two or three lines on what you covered and what each student should do next.
            Everyone who attended sees this.
          </p>
          <textarea
            rows={5}
            value={draft}
            maxLength={2000}
            onChange={(e) => { setDraft(e.target.value); setSaved(false) }}
            placeholder="We went through four resumes line by line. Next: rewrite your top three bullets with a number in each, and send one cold email a day for a week."
            className="mt-3 w-full rounded-[var(--radius-sm)] border border-border bg-surface p-3 text-sm leading-relaxed"
          />
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={saveNotes} disabled={busy === 'notes' || draft === notes}>
              {busy === 'notes' ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
              Save notes
            </Button>
            {saved && <Badge tone="green">Saved</Badge>}
          </div>
        </Card>
      )}

      {status === 'scheduled' && (
        <Card className="border-danger/40 p-5">
          <h2 className="text-base">Cancel this session</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Everyone booked is refunded in credits and told straight away.
            {startsInHours < 48 && seatsBooked > 0 && (
              <> Cancelling inside 48 hours adds a strike to your account, and three
              strikes suspends it.</>
            )}
          </p>
          {confirmCancel ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="danger" size="sm" disabled={busy === 'cancel'} onClick={cancelSession}>
                {busy === 'cancel' && <Loader2 className="animate-spin" aria-hidden />}
                Yes, cancel and refund everyone
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
                Keep it
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setConfirmCancel(true)}>
              Cancel session
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}
